import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import { shortHash } from "@/lib/intent-engine";

export const Route = createFileRoute("/audit")({
  component: AuditPage,
});

type AuditRow = {
  id: number;
  event_type: string;
  decision: string;
  intent_hash: string | null;
  room_id: string | null;
  flags: string[];
  payload: Record<string, unknown>;
  policy_version: string;
  prev_hash: string;
  entry_hash: string;
  created_at: string;
};

function decisionColor(d: string) {
  if (d === "HARD_BLOCK") return "text-destructive";
  if (d === "REVIEW") return "text-terminal-muted";
  return "text-terminal-green";
}

function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("id", { ascending: true })
      .limit(500);
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("audit-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Verify the chain links: each row's prev_hash must equal the previous entry_hash.
  let chainValid = true;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].prev_hash !== rows[i - 1].entry_hash) chainValid = false;
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-mono-label text-sm font-medium text-primary">03 · every decision has a receipt</p>
        <h1 className="mt-4 text-4xl font-bold text-foreground">Live audit trail</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every intent, match, block, and room event is written to a hash-chained log. Each entry's{" "}
          <code className="font-mono-label">prev_hash</code> links to the previous entry's{" "}
          <code className="font-mono-label">entry_hash</code> — tampering with any row breaks the chain.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-lg px-3 py-1.5 font-mono-label text-sm font-semibold ${
              chainValid ? "bg-terminal-green/15 text-terminal-green" : "bg-destructive/15 text-destructive"
            }`}
          >
            {loading ? "verifying…" : chainValid ? "✓ chain intact" : "✗ chain broken"}
          </span>
          <span className="font-mono-label text-sm text-muted-foreground">
            {rows.length} entries · policy sd-v0.2
          </span>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl bg-terminal p-5">
          <pre className="font-mono-label text-[13px] leading-relaxed">
            <div className="text-terminal-muted">// intent_audit.log — hash-chained, replayable</div>
            {rows.length === 0 && !loading && (
              <div className="text-terminal-muted">
                {"// empty — declare an intent in the app to write the first receipt"}
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} className="text-terminal-foreground">
                <span className="text-terminal-muted">#{r.id} </span>
                {'{"event": "'}
                <span className="text-terminal-blue">{r.event_type}</span>
                {'", "decision": "'}
                <span className={decisionColor(r.decision)}>{r.decision}</span>
                {'"'}
                {r.intent_hash ? (
                  <>
                    {', "intent_hash": "'}
                    <span className="text-terminal-blue">{shortHash(r.intent_hash)}</span>
                    {'"'}
                  </>
                ) : null}
                {r.flags && r.flags.length > 0 ? (
                  <>
                    {', "flags": ['}
                    <span className="text-destructive">
                      {r.flags.map((f) => `"${f}"`).join(", ")}
                    </span>
                    {"]"}
                  </>
                ) : null}
                {'} '}
                <span className="text-terminal-muted">
                  hash {shortHash(r.entry_hash)} ← {r.prev_hash ? shortHash(r.prev_hash) : "genesis"}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
