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

  await admin.from("audit_logs").insert({
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
      await admin.from("intents").insert({
        actor_id: data.actorId,
        actor_label: data.actorLabel,
        intent_text: text,
        intent_hash: intentHash,
        decision: policy.decision,
        flags: policy.flags,
        status,
      });
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
