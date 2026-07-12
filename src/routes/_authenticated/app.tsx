import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { declareIntent } from "@/lib/social.functions";
import { shortHash } from "@/lib/intent-engine";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppPage,
});

type IntentRow = {
  id: string;
  actor_id: string;
  actor_label: string;
  intent_text: string;
  intent_hash: string;
  status: string;
  created_at: string;
};

function AppPage() {
  const navigate = useNavigate();
  const declare = useServerFn(declareIntent);
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [intents, setIntents] = useState<IntentRow[]>([]);

  const loadFeed = useCallback(async () => {
    const { data } = await supabase
      .from("intents")
      .select("id, actor_id, actor_label, intent_text, intent_hash, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(30);
    setIntents((data as IntentRow[]) ?? []);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    const channel = supabase
      .channel("app-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "intents" }, () => loadFeed())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFeed]);

  async function onDeclare(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !actor.id) return;
    setBusy(true);
    try {
      const res = await declare({ data: { actorId: actor.id, actorLabel: actor.label, text } });
      await loadFeed();
      if (res.decision === "HARD_BLOCK") {
        toast.error(`HARD_BLOCK · ${res.flags?.join(", ")} — spam never surfaces.`);
      } else if (res.decision === "REVIEW") {
        toast.warning("REVIEW — intent too short to match. Add more detail.");
      } else if (res.matched && "roomId" in res) {
        toast.success(`Matched · ${res.topic} · similarity ${res.similarity}`);
        setText("");
        navigate({ to: "/rooms/$roomId", params: { roomId: res.roomId } });
        return;
      } else {
        toast.success("Live — waiting for a matching intent.");
      }
      setText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      console.error("Declare intent failed:", err);
      toast.error(message || "Could not declare intent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <p className="font-mono-label text-sm font-medium text-primary">intent engine · sd-v0.2</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Declare an intent</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          One sentence about what you want to do right now. If someone else wants the same thing, you
          land in a live room instantly.
        </p>
      </div>

      <form
        onSubmit={onDeclare}
        className="animate-fade-in mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "learn tabla with someone this month"'
            maxLength={280}
            className="w-full flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-60"
          >
            {busy ? "Matching…" : "Declare"}
          </button>
        </div>
        <p className="mt-3 font-mono-label text-xs text-muted-foreground">
          policy-gated · declaring as {actor.label || "…"} · match threshold ≥ 0.34
        </p>
      </form>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Live intents</h2>
          <span className="font-mono-label text-sm text-muted-foreground">{intents.length} active</span>
        </div>
        <ul className="mt-4 space-y-2">
          {intents.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No live intents yet. Be the first to declare.
            </li>
          )}
          {intents.map((i, idx) => (
            <li
              key={i.id}
              className={`animate-fade-in flex items-start gap-4 rounded-xl border bg-card px-4 py-3.5 transition-colors ${
                i.actor_id === actor.id ? "border-primary" : "border-border"
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <span className="font-mono-label text-sm text-muted-foreground">{i.actor_label}</span>
              <span className="flex-1 text-[15px] text-foreground">{i.intent_text}</span>
              <span className="font-mono-label text-xs text-muted-foreground">{shortHash(i.intent_hash)}</span>
            </li>
          ))}
        </ul>
        <Link
          to="/rooms"
          className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          View your rooms →
        </Link>
      </section>
    </div>
  );
}
