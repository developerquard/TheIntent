import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  evaluateIntentPolicy,
  computeIntentSimilarity,
  deriveTags,
  MATCH_THRESHOLD,
  POLICY_VERSION,
} from "./intent-engine";

const DeclareInput = z.object({
  actorId: z.string().min(3).max(64),
  actorLabel: z.string().min(1).max(24),
  text: z.string().min(1).max(280),
});

const MessageInput = z.object({
  roomId: z.string().uuid(),
  senderId: z.string().min(3).max(64),
  senderLabel: z.string().min(1).max(24),
  content: z.string().min(1).max(1000),
});

const WaitlistInput = z.object({
  email: z.string().email().max(200),
  kind: z.enum(["waitlist", "partner"]).default("waitlist"),
});

const CreateCollaborationRoomInput = z.object({
  actorId: z.string().min(3).max(64),
  actorLabel: z.string().min(1).max(24),
  text: z.string().min(1).max(280),
  roomName: z.string().min(1).max(50),
  maxMembers: z.union([z.literal(2), z.literal(4), z.literal(6), z.literal(8), z.literal(10)]),
  joinMethod: z.enum(["admin_approval", "member_voting"]),
});

const RequestJoinRoomInput = z.object({
  roomId: z.string().uuid(),
  actorId: z.string().min(3).max(64),
  actorLabel: z.string().min(1).max(24),
});

const HandleJoinRequestInput = z.object({
  requestId: z.string().uuid(),
  actorId: z.string().min(3).max(64),
  action: z.enum(["approve", "decline"]),
});

async function sha256(input: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(input).digest("hex");
}

// Append a hash-chained audit entry. Each entry_hash = sha256(prev_hash + payload).
async function appendAudit(
  admin: any,
  entry: {
    event_type: string;
    decision: string;
    intent_hash?: string | null;
    room_id?: string | null;
    flags?: string[];
    payload?: Record<string, unknown>;
  },
) {
  const { data: last } = await admin
    .from("audit_logs")
    .select("entry_hash")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash: string = last?.entry_hash ?? "";
  const payload = entry.payload ?? {};
  const body = JSON.stringify({
    event_type: entry.event_type,
    decision: entry.decision,
    intent_hash: entry.intent_hash ?? null,
    room_id: entry.room_id ?? null,
    flags: entry.flags ?? [],
    payload,
  });
  const entryHash = await sha256(prevHash + body);

  const { error: auditError } = await admin.from("audit_logs").insert({
    event_type: entry.event_type,
    decision: entry.decision,
    intent_hash: entry.intent_hash ?? null,
    room_id: entry.room_id ?? null,
    flags: entry.flags ?? [],
    payload,
    policy_version: POLICY_VERSION,
    prev_hash: prevHash,
    entry_hash: entryHash,
  });

  if (auditError) {
    throw new Error(`Failed to append audit log: ${auditError.message}`);
  }

  return entryHash;
}

export const declareIntent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeclareInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const text = data.text.trim();
    const policy = evaluateIntentPolicy(text);
    const intentHash = await sha256(text.toLowerCase());

    // Blocked / review intents never surface into rooms.
    if (policy.decision !== "ALLOW") {
      const status = policy.decision === "HARD_BLOCK" ? "blocked" : "review";
      const { error: insertError } = await admin.from("intents").insert({
        actor_id: data.actorId,
        actor_label: data.actorLabel,
        intent_text: text,
        intent_hash: intentHash,
        decision: policy.decision,
        flags: policy.flags,
        status,
      });
      if (insertError) {
        throw new Error(`Failed to insert intent: ${insertError.message}`);
      }
      await appendAudit(admin, {
        event_type: "intent_declared",
        decision: policy.decision,
        intent_hash: intentHash,
        flags: policy.flags,
        payload: { reason: policy.reason },
      });
      return {
        decision: policy.decision,
        reason: policy.reason,
        flags: policy.flags,
        matched: false as const,
        intentHash,
      };
    }

    // ALLOW: log the declaration, then try to match.
    await appendAudit(admin, {
      event_type: "intent_declared",
      decision: "ALLOW",
      intent_hash: intentHash,
      payload: { text },
    });

    const { data: candidates } = await admin
      .from("intents")
      .select("id, actor_id, actor_label, intent_text")
      .eq("status", "active")
      .is("room_id", null)
      .neq("actor_id", data.actorId)
      .order("created_at", { ascending: true })
      .limit(50);

    let best: { id: string; actor_id: string; actor_label: string; intent_text: string; score: number } | null =
      null;
    for (const c of candidates ?? []) {
      const score = computeIntentSimilarity(text, c.intent_text);
      if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { ...c, score };
      }
    }

    if (best) {
      const tags = deriveTags(text, best.intent_text);
      const topic = tags.join(" · ") || "shared intent";

      const { data: room } = await admin
        .from("rooms")
        .insert({
          topic,
          tags,
          intent_hash: intentHash,
          member_ids: [best.actor_id, data.actorId],
          member_labels: [best.actor_label, data.actorLabel],
          decision: "ALLOW",
          match_similarity: best.score,
          status: "open",
        })
        .select("id")
        .single();

      const roomId = room.id as string;

      // Insert my intent already matched, and mark the candidate matched.
      await admin.from("intents").insert({
        actor_id: data.actorId,
        actor_label: data.actorLabel,
        intent_text: text,
        intent_hash: intentHash,
        decision: "ALLOW",
        status: "matched",
        room_id: roomId,
        match_similarity: best.score,
      });
      await admin
        .from("intents")
        .update({ status: "matched", room_id: roomId, match_similarity: best.score })
        .eq("id", best.id);

      await appendAudit(admin, {
        event_type: "match_evaluated",
        decision: "ALLOW",
        intent_hash: intentHash,
        room_id: roomId,
        payload: { similarity: best.score, threshold: MATCH_THRESHOLD },
      });

      // Seed a system message so the room is alive on arrival.
      await admin.from("room_messages").insert({
        room_id: roomId,
        sender_id: "system",
        sender_label: "policy engine",
        role: "system",
        content: `Room formed · ${topic} · decision ALLOW · similarity ${best.score}`,
      });

      return {
        decision: "ALLOW" as const,
        matched: true as const,
        roomId,
        similarity: best.score,
        topic,
        intentHash,
      };
    }

    // No match yet: intent stays live, waiting.
    await admin.from("intents").insert({
      actor_id: data.actorId,
      actor_label: data.actorLabel,
      intent_text: text,
      intent_hash: intentHash,
      decision: "ALLOW",
      status: "active",
    });

    return {
      decision: "ALLOW" as const,
      matched: false as const,
      reason: "Live — waiting for someone with a matching intent.",
      intentHash,
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MessageInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: room } = await admin
      .from("rooms")
      .select("member_ids, status")
      .eq("id", data.roomId)
      .single();

    if (!room || room.status !== "open") throw new Error("Room is not open");
    if (!room.member_ids.includes(data.senderId)) throw new Error("Not a member of this room");

    const { data: msg } = await admin
      .from("room_messages")
      .insert({
        room_id: data.roomId,
        sender_id: data.senderId,
        sender_label: data.senderLabel,
        role: "user",
        content: data.content.trim(),
      })
      .select("id")
      .single();

    return { id: msg.id as string };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ roomId: z.string().uuid(), actorId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    await admin
      .from("rooms")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", data.roomId);
    await admin
      .from("collaboration_rooms")
      .update({ status: "inactive" })
      .eq("id", data.roomId);
    await admin.from("intents").update({ status: "expired" }).eq("room_id", data.roomId);

    await appendAudit(admin, {
      event_type: "room_closed",
      decision: "ALLOW",
      room_id: data.roomId,
      payload: { by: data.actorId, reason: "intent faded" },
    });
    return { ok: true };
  });

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => WaitlistInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    await admin.from("waitlist").insert({ email: data.email.toLowerCase(), kind: data.kind });
    return { ok: true };
  });

export const createCollaborationRoom = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateCollaborationRoomInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const text = data.text.trim();
    const policy = evaluateIntentPolicy(text);
    const intentHash = await sha256(text.toLowerCase());

    if (policy.decision !== "ALLOW") {
      return {
        decision: policy.decision,
        reason: policy.reason,
        flags: policy.flags,
        success: false,
      };
    }

    const tags = deriveTags(text, text);
    const topic = tags.join(" · ") || "shared intent";

    // Insert into rooms table first to satisfy FK constraints and enable room pages
    const { data: mainRoom } = await admin
      .from("rooms")
      .insert({
        topic,
        tags,
        intent_hash: intentHash,
        member_ids: [data.actorId],
        member_labels: [data.actorLabel],
        decision: "ALLOW",
        status: "open",
      })
      .select("id")
      .single();

    const { data: room } = await admin
      .from("collaboration_rooms")
      .insert({
        id: mainRoom.id,
        name: data.roomName,
        topic,
        intent_hash: intentHash,
        max_members: data.maxMembers,
        join_method: data.joinMethod,
        admin_id: data.actorId,
        member_ids: [data.actorId],
        member_labels: [data.actorLabel],
        status: "active",
      })
      .select("id")
      .single();

    // Insert the intent as matched to this room
    await admin.from("intents").insert({
      actor_id: data.actorId,
      actor_label: data.actorLabel,
      intent_text: text,
      intent_hash: intentHash,
      decision: "ALLOW",
      status: "matched",
      room_id: mainRoom.id,
    });

    await appendAudit(admin, {
      event_type: "collaboration_room_created",
      decision: "ALLOW",
      intent_hash: intentHash,
      room_id: mainRoom.id,
      payload: {
        room_name: data.roomName,
        max_members: data.maxMembers,
        join_method: data.joinMethod,
      },
    });

    return {
      success: true,
      roomId: mainRoom.id,
      topic,
    };
  });

export const getCollaborationRooms = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ intentHash: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: rooms } = await admin
      .from("collaboration_rooms")
      .select("id, name, topic, max_members, member_ids, member_labels, join_method, created_at")
      .eq("intent_hash", data.intentHash)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    return {
      rooms: rooms?.map((r: any) => ({
        id: r.id,
        name: r.name,
        topic: r.topic,
        maxMembers: r.max_members,
        currentMembers: r.member_ids.length,
        memberLabels: r.member_labels,
        joinMethod: r.join_method,
        createdAt: r.created_at,
      })) ?? [],
    };
  });

export const requestJoinRoom = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RequestJoinRoomInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: room } = await admin
      .from("collaboration_rooms")
      .select("id, member_ids, max_members, join_method, admin_id")
      .eq("id", data.roomId)
      .single();

    if (!room) throw new Error("Room not found");
    if (room.member_ids.length >= room.max_members) throw new Error("Room is full");
    if (room.member_ids.includes(data.actorId)) throw new Error("Already a member");

    // Check if already has pending request
    const { data: existing } = await admin
      .from("join_requests")
      .select("id")
      .eq("room_id", data.roomId)
      .eq("requester_id", data.actorId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) throw new Error("Request already pending");

    // Create join request
    const { data: request } = await admin
      .from("join_requests")
      .insert({
        room_id: data.roomId,
        requester_id: data.actorId,
        requester_label: data.actorLabel,
        status: "pending",
      })
      .select("id")
      .single();

    // Create notifications
    const notifyUsers = room.join_method === "admin_approval" 
      ? [room.admin_id] 
      : room.member_ids;

    for (const userId of notifyUsers) {
      await admin.from("notifications").insert({
        user_id: userId,
        type: "join_request",
        title: `${data.actorLabel} wants to join your collaboration`,
        body: `${data.actorLabel} requested to join the room.`,
        related_id: request.id,
      });
    }

    await appendAudit(admin, {
      event_type: "join_request_created",
      decision: "ALLOW",
      room_id: data.roomId,
      payload: { requester_id: data.actorId, requester_label: data.actorLabel },
    });

    return { success: true, requestId: request.id };
  });

export const handleJoinRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => HandleJoinRequestInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: request } = await admin
      .from("join_requests")
      .select("id, room_id, requester_id, requester_label, status")
      .eq("id", data.requestId)
      .single();

    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    const { data: room } = await admin
      .from("collaboration_rooms")
      .select("id, member_ids, member_labels, max_members, admin_id, join_method")
      .eq("id", request.room_id)
      .single();

    if (!room) throw new Error("Room not found");

    // Verify authorization
    if (room.join_method === "admin_approval" && data.actorId !== room.admin_id) {
      throw new Error("Only admin can approve requests");
    }
    if (room.join_method === "member_voting" && !room.member_ids.includes(data.actorId)) {
      throw new Error("Only members can vote");
    }

    if (data.action === "approve") {
      if (room.member_ids.length >= room.max_members) {
        throw new Error("Room is full");
      }

      // Add member to collaboration_rooms
      await admin
        .from("collaboration_rooms")
        .update({
          member_ids: [...room.member_ids, request.requester_id],
          member_labels: [...room.member_labels, request.requester_label],
        })
        .eq("id", room.id);

      // Add member to rooms table
      const { data: roomsRow } = await admin
        .from("rooms")
        .select("member_ids, member_labels")
        .eq("id", room.id)
        .single();

      if (roomsRow) {
        const newMemberIds = Array.from(new Set([...roomsRow.member_ids, request.requester_id]));
        const newMemberLabels = [...roomsRow.member_labels];
        if (!roomsRow.member_ids.includes(request.requester_id)) {
          newMemberLabels.push(request.requester_label);
        }
        await admin
          .from("rooms")
          .update({
            member_ids: newMemberIds,
            member_labels: newMemberLabels,
          })
          .eq("id", room.id);
      }

      // Update request status
      await admin
        .from("join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      // Create notification for requester
      await admin.from("notifications").insert({
        user_id: request.requester_id,
        type: "join_approved",
        title: "You've been approved to join the collaboration",
        body: "Your request to join has been approved.",
        related_id: room.id,
      });

      // Insert intent as matched
      await admin.from("intents").insert({
        actor_id: request.requester_id,
        actor_label: request.requester_label,
        intent_text: "Joined collaboration room",
        intent_hash: room.intent_hash,
        decision: "ALLOW",
        status: "matched",
        room_id: room.id,
      });

      await appendAudit(admin, {
        event_type: "join_request_approved",
        decision: "ALLOW",
        room_id: room.id,
        payload: { requester_id: request.requester_id, approved_by: data.actorId },
      });
    } else {
      // Decline
      await admin
        .from("join_requests")
        .update({ status: "declined" })
        .eq("id", request.id);

      // Create notification for requester
      await admin.from("notifications").insert({
        user_id: request.requester_id,
        type: "join_declined",
        title: "Your join request was declined",
        body: "Your request to join the collaboration was declined.",
        related_id: room.id,
      });

      await appendAudit(admin, {
        event_type: "join_request_declined",
        decision: "ALLOW",
        room_id: room.id,
        payload: { requester_id: request.requester_id, declined_by: data.actorId },
      });
    }

    return { success: true };
  });

export const getNotifications = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: notifications } = await admin
      .from("notifications")
      .select("*")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      notifications: notifications ?? [],
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ notificationId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.notificationId);

    return { success: true };
  });
