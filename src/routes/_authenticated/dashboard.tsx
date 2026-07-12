import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Zap, MessagesSquare, Activity, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { shortHash } from "@/lib/intent-engine";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type IntentRow = {
  id: string;
  intent_text: string;
  intent_hash: string;
  status: string;
  decision: string;
  room_id: string | null;
  created_at: string;
};

type RoomRow = {
  id: string;
  topic: string;
  status: string;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function statusStyle(status: string) {
  switch (status) {
    case "matched":
      return "bg-terminal-green/15 text-terminal-green";
    case "active":
      return "bg-primary/15 text-primary";
    case "blocked":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function DashboardPage() {
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const [intents, setIntents] = useState<IntentRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);

  const load = useCallback(async (actorId: string) => {
    if (!actorId) return;
    const [{ data: iData }, { data: rData }] = await Promise.all([
      supabase
        .from("intents")
        .select("id, intent_text, intent_hash, status, decision, room_id, created_at")
        .eq("actor_id", actorId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("rooms")
        .select("id, topic, status, created_at")
        .contains("member_ids", [actorId])
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setIntents((iData as IntentRow[]) ?? []);
    setRooms((rData as RoomRow[]) ?? []);
  }, []);

  useEffect(() => {
    if (actor.id) load(actor.id);
  }, [actor.id, load]);

  useEffect(() => {
    if (!actor.id) return;
    const channel = supabase
      .channel("dash-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "intents" }, () => load(actor.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => load(actor.id))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [actor.id, load]);

  const openRooms = rooms.filter((r) => r.status === "open").length;
  const matched = intents.filter((i) => i.status === "matched").length;

  // Merge intents + rooms into a single recent-activity stream.
  const activity = [
    ...intents.map((i) => ({
      kind: "intent" as const,
      id: `i-${i.id}`,
      when: i.created_at,
      title: i.intent_text,
      meta: `${i.decision} · ${i.status}`,
      to: i.room_id ? `/rooms/${i.room_id}` : "/app",
    })),
    ...rooms.map((r) => ({
      kind: "room" as const,
      id: `r-${r.id}`,
      when: r.created_at,
      title: `Room · ${r.topic}`,
      meta: r.status === "open" ? "live room" : "faded",
      to: `/rooms/${r.id}`,
    })),
  ]
    .sort((a, b) => +new Date(b.when) - +new Date(a.when))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <p className="font-mono-label text-sm font-medium text-primary">welcome back</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">
          Hi {actor.label || "there"} 👋
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's moving. Declare a new intent to open a live room.
        </p>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Zap, label: "Intents declared", value: intents.length },
          { icon: Sparkles, label: "Matched", value: matched },
          { icon: MessagesSquare, label: "Open rooms", value: openRooms },
        ].map((s, i) => (
          <div
            key={s.label}
            className="animate-fade-in rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Recent intents */}
        <section className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent intents</h2>
            <Link to="/app" className="group flex items-center gap-1 text-sm font-semibold text-primary">
              New intent
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-3 space-y-2.5">
            {intents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No intents yet.{" "}
                <Link to="/app" className="font-semibold text-primary hover:underline">
                  Declare your first →
                </Link>
              </div>
            )}
            {intents.map((i, idx) => (
              <Link
                key={i.id}
                to={i.room_id ? "/rooms/$roomId" : "/app"}
                params={i.room_id ? { roomId: i.room_id } : undefined}
                className="animate-fade-in flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-md"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <span className={`mt-0.5 rounded-md px-2 py-0.5 font-mono-label text-xs font-semibold ${statusStyle(i.status)}`}>
                  {i.status}
                </span>
                <span className="flex-1 text-[15px] text-foreground">{i.intent_text}</span>
                <span className="whitespace-nowrap font-mono-label text-xs text-muted-foreground">
                  {timeAgo(i.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Activity feed */}
        <section className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Recent activity</h2>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            {activity.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
            )}
            <ol className="relative space-y-4">
              {activity.map((a, idx) => (
                <li key={a.id} className="animate-fade-in flex gap-3" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${a.kind === "room" ? "bg-terminal-green" : "bg-primary"}`} />
                    {idx < activity.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                  </div>
                  <Link to={a.to} className="group flex-1 pb-1">
                    <p className="line-clamp-2 text-sm text-foreground group-hover:text-primary">{a.title}</p>
                    <p className="mt-0.5 font-mono-label text-xs text-muted-foreground">
                      {a.meta} · {timeAgo(a.when)}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
