import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { sendMessage, leaveRoom } from "@/lib/social.functions";
import { shortHash } from "@/lib/intent-engine";
import { CallPanel } from "@/components/call-panel";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  component: RoomPage,
});

type Message = {
  id: string;
  sender_id: string;
  sender_label: string;
  role: string;
  content: string;
  created_at: string;
};

type Room = {
  id: string;
  topic: string;
  tags: string[];
  member_ids: string[];
  member_labels: string[];
  match_similarity: number | null;
  intent_hash: string;
  status: string;
};

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const send = useServerFn(sendMessage);
  const leave = useServerFn(leaveRoom);
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadRoom = useCallback(async () => {
    const { data } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
    setRoom(data as Room | null);
  }, [roomId]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, [roomId]);

  useEffect(() => {
    loadRoom();
    loadMessages();
  }, [loadRoom, loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        () => loadMessages(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        () => loadRoom(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, loadMessages, loadRoom]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isMember = room?.member_ids.includes(actor.id) ?? false;
  const isOpen = room?.status === "open";

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !room) return;
    setBusy(true);
    try {
      await send({ data: { roomId, senderId: actor.id, senderLabel: actor.label, content: draft } });
      setDraft("");
    } catch {
      toast.error("Message rejected.");
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    if (!room) return;
    try {
      await leave({ data: { roomId, actorId: actor.id } });
      toast.success("Intent faded — room closed.");
      navigate({ to: "/rooms" });
    } catch {
      toast.error("Could not close room.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-8 md:px-10">
      <Link to="/rooms" className="text-sm font-semibold text-primary hover:underline">
        ← back to rooms
      </Link>

      {!room && <p className="mt-8 text-muted-foreground">Loading room…</p>}

      {room && (
        <>
          <div className="animate-fade-in mt-4 rounded-2xl border-2 border-primary bg-accent/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-foreground">Room · {room.topic}</h1>
              {isMember && isOpen && (
                <button
                  onClick={onLeave}
                  className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Leave (let it fade)
                </button>
              )}
            </div>
            <p className="mt-2 font-mono-label text-sm text-muted-foreground">
              {room.member_labels.length} members · decision {isOpen ? "ALLOW" : "CLOSED"} · intent_hash{" "}
              {shortHash(room.intent_hash)}
              {room.match_similarity != null ? ` · similarity ${room.match_similarity}` : ""}
            </p>
          </div>

          {isOpen && <CallPanel roomId={roomId} selfId={actor.id} canCall={isMember} />}



          <div className="mt-6 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-5">
            {messages.map((m) => {
              if (m.role === "system") {
                return (
                  <p key={m.id} className="text-center font-mono-label text-xs text-muted-foreground">
                    {m.content}
                  </p>
                );
              }
              const mine = m.sender_id === actor.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] animate-fade-in rounded-2xl px-4 py-2.5 ${
                      mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {!mine && <p className="font-mono-label text-xs opacity-70">{m.sender_label}</p>}
                    <p className="text-[15px]">{m.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {isMember && isOpen ? (
            <form onSubmit={onSend} className="mt-4 flex gap-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the room…"
                maxLength={1000}
                className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
              >
                Send
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {isOpen
                ? "You're viewing this room read-only — you're not a member."
                : "This room has faded. Its audit trail stays verifiable forever."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
