import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <p className="font-mono-label text-sm font-medium text-primary">community</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Community</h1>
        <p className="mt-2 text-muted-foreground">
          A space for recurring intents, standing rooms, and city clusters.
        </p>
      </div>

      <div className="animate-fade-in mt-10 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-foreground">Coming soon</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          We're designing the Community tab next — standing intents, city-based clusters, and
          persistent rooms that outlive a single match.
        </p>
        <Link
          to="/app"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Declare an intent meanwhile
        </Link>
      </div>
    </div>
  );
}
