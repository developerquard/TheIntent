import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { joinWaitlist } from "@/lib/social.functions";

export const Route = createFileRoute("/")({
  component: Landing,
});

const LIVE_INTENTS = [
  { id: "u_9kd", text: "learn tabla with someone this month", hot: false },
  { id: "u_t2m", text: "want to meet AI security builders in Mumbai", hot: true },
  { id: "u_p81", text: "game jam team for the weekend — pixel artist here", hot: false },
  { id: "u_c44", text: "vegan hiking group near Tokyo", hot: false },
  { id: "u_8xz", text: "practicing case interviews, need a partner", hot: false },
];

function MonoLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono-label text-sm font-medium text-primary">{children}</p>;
}

function Landing() {
  return (
    <div className="relative z-10 min-h-screen">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <Monetization />
      <AuditSection />
      <ClosingCta />
      <Footer />
    </div>
  );
}

function Hero() {
  const submit = useServerFn(joinWaitlist);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await submit({ data: { email, kind: "waitlist" } });
      toast.success("You're on the list — Mumbai first.");
      setEmail("");
    } catch {
      toast.error("Enter a valid email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 pb-20">
      <MonoLabel>intent matching for the right moment</MonoLabel>
      <div className="mt-8 grid gap-14 lg:grid-cols-2 lg:items-start">
        <div className="animate-fade-in">
          <h1 className="text-5xl font-bold leading-[1.02] text-foreground sm:text-6xl">
            Find the room that matches what you want right now.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
            No feed. No followers. No algorithm deciding what you see. Declare an intent — "find
            co-founders in Bengaluru", "learn tabla", "ship a game jam this weekend" — and you're
            matched into the right live room in seconds.
          </p>

          <form onSubmit={onSubmit} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-xl border border-input bg-card px-4 py-3.5 text-base text-foreground outline-none transition-colors focus:border-primary sm:max-w-xs"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Get early access
            </button>
          </form>
          <p className="mt-4 font-mono-label text-sm text-muted-foreground">
            every match is policy-gated and audit-chained · sd-v0.2
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Or open the live app and declare now →
          </Link>
        </div>

        <LiveIntentsCard />
      </div>
    </section>
  );
}

function LiveIntentsCard() {
  return (
    <div
      className="animate-fade-in rounded-3xl border border-border bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl"
      style={{ animationDelay: "120ms" }}
    >
      <div className="flex items-center justify-between font-mono-label text-sm">
        <span className="flex items-center gap-2 text-terminal-green">
          <span className="h-2 w-2 rounded-full bg-terminal-green" /> live intents
        </span>
        <span className="text-muted-foreground">policy sd-v0.2 · shadow off</span>
      </div>
      <div className="mt-4 h-px bg-border" />
      <ul className="mt-2 divide-y divide-transparent">
        {LIVE_INTENTS.map((i) => (
          <li
            key={i.id}
            className={`flex items-start gap-4 rounded-xl px-3 py-3.5 ${i.hot ? "bg-accent" : ""}`}
          >
            <span className="font-mono-label text-sm text-muted-foreground">{i.id}</span>
            <span className="text-[15px] text-foreground">{i.text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-2xl border-2 border-primary bg-accent/60 p-5">
        <p className="font-semibold text-foreground">Room formed · ai · security · mumbai</p>
        <p className="mt-1 font-mono-label text-sm text-muted-foreground">
          2 members · decision ALLOW · intent_hash f067…5e77
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: "Declare",
    body: "One sentence about what you want to do right now. That's your entire profile.",
    code: "intent_type: join_group",
  },
  {
    title: "Match",
    body: "Live intents are matched on meaning — confidence scored, never inferred from your history.",
    code: "profile_similarity ≥ 0.34",
  },
  {
    title: "Land",
    body: "A room opens the moment a match clears the policy gate. Real people, right now, same goal.",
    code: "decision: ALLOW → visible",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <MonoLabel>01 · declared → matched → gated → live</MonoLabel>
        <h2 className="mt-6 max-w-3xl text-4xl font-bold text-foreground sm:text-5xl">
          Communities that exist because you asked for them
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Every room on The Intent is created by two or more people declaring the same intent at
          the same time. When the intent fades, the room can too. Nothing is engineered to keep you
          scrolling.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
              <p className="mt-6 font-mono-label text-sm text-muted-foreground">{s.code}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 opacity-70 shadow-sm">
            <h3 className="text-xl font-bold text-muted-foreground line-through">Infinite feed</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Engagement-optimized ranking, parasocial follower graphs, and content you never asked
              for.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-sm">
            <h3 className="text-xl font-bold text-foreground">Finite rooms</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              You came for something specific. You got it. You leave. That's the product working,
              not failing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const PLANS = [
  {
    name: "Intent-matched sponsors",
    price: "CPM + CPA",
    unit: "/ per cluster",
    body: "One labeled sponsor slot per room, matched to the room's declared intent. Placement only in ALLOW-state rooms — brand safety is enforced by the policy engine, not a moderation queue.",
    sponsored: true,
  },
  {
    name: "Pro",
    price: "$8",
    unit: "/ month",
    body: "For power connectors.",
    bullets: [
      "Priority matching queue",
      "Persistent rooms that outlive the intent",
      'Standing intents — "alert me when someone declares X"',
      "Ad-free experience",
    ],
  },
  {
    name: "Launch rooms",
    price: "from $499",
    unit: "/ campaign",
    body: "Brands, hirers, and event teams host intent-gated rooms — a product launch that only opens to people who declared interest in the category.",
    bullets: [
      "Intent-qualified audience only",
      "Auditable reach reports",
      "No retargeting, no data resale",
    ],
  },
];

function Monetization() {
  return (
    <section id="brands" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <MonoLabel>02 · monetized — without surveillance</MonoLabel>
        <h2 className="mt-6 max-w-3xl text-4xl font-bold text-foreground sm:text-5xl">
          Ads that answer an intent, not stalk a person
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Search built the biggest ad business in history on <em>inferred</em> intent.
          The Intent runs on <em>declared</em> intent — the strongest commercial signal there is —
          with zero behavioral tracking. Brands bid on intent clusters, never on people.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
              <p className="mt-4">
                <span className="text-3xl font-bold text-foreground">{p.price}</span>{" "}
                <span className="font-mono-label text-sm text-muted-foreground">{p.unit}</span>
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
              {p.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-[15px] text-muted-foreground">
                      <span className="text-primary">—</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.sponsored && (
                <div className="mt-5 rounded-xl bg-secondary p-4">
                  <span className="rounded-md bg-sponsored px-2 py-0.5 font-mono-label text-xs font-semibold text-sponsored-foreground">
                    sponsored
                  </span>
                  <p className="mt-2 text-[15px] font-semibold text-foreground">
                    TrailKit — ultralight gear for the "hiking · tokyo" room
                  </p>
                  <p className="mt-1 font-mono-label text-xs text-muted-foreground">
                    placement receipt a91f…c2
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AUDIT_LINES = [
  { text: "// intent_audit.log — hash-chained, replayable", muted: true },
  { text: '{"event": "intent_declared", "decision": "ALLOW", "intent_hash": "b39e…9639"}' },
  { text: '{"event": "match_evaluated", "decision": "ALLOW", "intent_hash": "12f7…accb"}' },
  { text: '{"event": "sponsor_placed", "room": "a91f2c", "policy_version": "sd-v0.2"}' },
  {
    text: '{"event": "intent_declared", "decision": "HARD_BLOCK", "flags": ["MASS_OUTREACH"]} // spam never surfaces',
  },
];

function AuditSection() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <MonoLabel>03 · every decision has a receipt</MonoLabel>
        <h2 className="mt-6 max-w-3xl text-4xl font-bold text-foreground sm:text-5xl">
          The only social network with an audit trail
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Every match, block, and sponsored placement is evaluated by a deterministic policy engine
          and written to a hash-chained log. Regulators, brands, and users can verify why something
          was shown — or why it never was.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl bg-terminal p-6">
          <pre className="font-mono-label text-[13px] leading-relaxed sm:text-sm">
            {AUDIT_LINES.map((l, idx) => (
              <div
                key={idx}
                className={l.muted ? "text-terminal-muted" : "text-terminal-foreground"}
              >
                {l.text}
              </div>
            ))}
          </pre>
        </div>
        <Link
          to="/audit"
          className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open the live audit trail →
        </Link>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-24 text-center">
        <h2 className="text-4xl font-bold text-foreground sm:text-5xl">
          Stop scrolling. Start declaring.
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Early access opens city by city. Mumbai first.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Join the waitlist
          </Link>
          <Link
            to="/auth"
            className="rounded-xl border border-input bg-card px-7 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Partner with us
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
        <span>
          Social<span className="text-primary">Discovery</span> · intent over identity
        </span>
        <span className="font-mono-label">policy sd-v0.2 · audit-chained</span>
      </div>
    </footer>
  );
}
