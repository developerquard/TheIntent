import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { MessagesSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { shortHash } from "@/lib/intent-engine";

export const Route = createFileRoute("/_authenticated/rooms/")({
  component: RoomsListPage,
});

type RoomRow = {
  id: string;
  topic: string;
  member_labels: string[];
  match_similarity: number | null;
  intent_hash: string;
  status: string;
  created_at: string;
};

function RoomsListPage() {
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  const load = useCallback(async (actorId: string) => {
    if (!actorId) return;
    const { data } = await supabase
      .from("rooms")
      .select("id, topic, member_labels, match_similarity, intent_hash, status, created_at")
      .contains("member_ids", [actorId])
      .order("created_at", { ascending: false });
    setRooms((data as RoomRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (actor.id) load(actor.id);
  }, [actor.id, load]);

  useEffect(() => {
    if (!actor.id) return;
    const channel = supabase
      .channel("rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () =>
        load(actor.id),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [actor.id, load]);

  const open = rooms.filter((r) => r.status === "open");
  const faded = rooms.filter((r) => r.status !== "open");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <p className="font-mono-label text-sm font-medium text-primary">rooms formed</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Your rooms</h1>
        <p className="mt-2 text-muted-foreground">
          Every room here exists because you and someone else declared the same intent.
        </p>
      </div>

      {rooms.length === 0 && (
        <div className="animate-fade-in mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
          <MessagesSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">No rooms yet.</p>
          <Link to="/app" className="mt-4 inline-block font-semibold text-primary hover:underline">
            Declare an intent →
          </Link>
        </div>
      )}

      {open.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Live
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {open.map((r, idx) => (
              <RoomCard key={r.id} r={r} idx={idx} />
            ))}
          </div>
        </section>
      )}

      {faded.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Faded
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {faded.map((r, idx) => (
              <RoomCard key={r.id} r={r} idx={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RoomCard({ r, idx }: { r: RoomRow; idx: number }) {
  return (
    <Link
      to="/rooms/$roomId"
      params={{ roomId: r.id }}
      className="animate-fade-in block rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-md"
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">{r.topic}</p>
        <span
          className={`h-2.5 w-2.5 rounded-full ${r.status === "open" ? "bg-terminal-green" : "bg-muted-foreground/40"}`}
        />
      </div>
      <p className="mt-2 font-mono-label text-xs text-muted-foreground">
        {r.member_labels.join(" · ")}
      </p>
      <p className="mt-1 font-mono-label text-xs text-muted-foreground">
        {r.status === "open" ? "ALLOW" : "CLOSED"} · {shortHash(r.intent_hash)}
        {r.match_similarity != null ? ` · sim ${r.match_similarity}` : ""}
      </p>
    </Link>
  );
}
