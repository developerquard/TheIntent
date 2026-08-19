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
      .limit(20);
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
        <h1 className="mt-4 text-4xl font-bold text-foreground">Transparency you can verify</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Every important decision has a receipt. You can verify why something was shown—or why it was blocked.
          No hidden algorithms, no black boxes.
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
            {rows.length} entries
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-3">
            {rows.length === 0 && !loading && (
              <div className="py-8 text-center text-muted-foreground">
                No decisions yet. Declare an intent to see the first receipt.
              </div>
            )}
            {rows.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-xl bg-accent/30 p-4">
                <div className={`mt-1 h-2 w-2 rounded-full ${
                  r.decision === "HARD_BLOCK" ? "bg-destructive" : 
                  r.decision === "REVIEW" ? "bg-yellow-500" : 
                  "bg-terminal-green"
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{r.event_type.replace(/_/g, " ")}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      r.decision === "HARD_BLOCK" ? "bg-destructive/15 text-destructive" : 
                      r.decision === "REVIEW" ? "bg-yellow-500/15 text-yellow-600" : 
                      "bg-terminal-green/15 text-terminal-green"
                    }`}>
                      {r.decision}
                    </span>
                  </div>
                  {r.flags && r.flags.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Flags: {r.flags.join(", ")}
                    </p>
                  )}
                  <p className="mt-1 font-mono-label text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline">
            Learn how it works
          </summary>
          <div className="mt-4 rounded-2xl border border-border bg-terminal p-5">
            <pre className="font-mono-label text-[13px] leading-relaxed">
              <div className="text-terminal-muted">// intent_audit.log — hash-chained, replayable</div>
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
        </details>
      </div>
    </div>
  );
}
