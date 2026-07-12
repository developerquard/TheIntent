import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Moon, Sun, Palette, Bell, Check } from "lucide-react";
import { useState } from "react";
import { useTheme, type ThemePref } from "@/lib/use-theme";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun; hint: string }[] = [
  { value: "light", label: "Light", icon: Sun, hint: "Always bright" },
  { value: "dark", label: "Dark", icon: Moon, hint: "Always dim" },
  { value: "system", label: "System", icon: Monitor, hint: "Match your device" },
];

function SettingsPage() {
  const { theme, resolved, setTheme } = useTheme();
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [soundCues, setSoundCues] = useState(true);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <p className="font-mono-label text-sm font-medium text-primary">preferences</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Personalize how SocialDiscovery looks and feels. Changes save instantly.
        </p>
      </div>

      {/* Appearance */}
      <section
        className="animate-fade-in mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Appearance</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Currently showing the <span className="font-semibold text-foreground">{resolved}</span> theme.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:border-primary/50",
                )}
              >
                {active && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                <span className="font-semibold text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Experience */}
      <section
        className="animate-fade-in mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Experience</h2>
        </div>

        <div className="mt-4 divide-y divide-border">
          <ToggleRow
            title="Reduce motion"
            desc="Calm the animated background and transitions."
            checked={reduceMotion}
            onChange={setReduceMotion}
          />
          <ToggleRow
            title="Sound cues"
            desc="Play a soft chime when a room matches."
            checked={soundCues}
            onChange={setSoundCues}
          />
        </div>
      </section>

      {/* Account */}
      <section
        className="animate-fade-in mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: "180ms" }}
      >
        <h2 className="text-lg font-bold text-foreground">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Display name</dt>
            <dd className="font-semibold text-foreground">{actor.label || "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-semibold text-foreground">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Actor ID</dt>
            <dd className="font-mono-label text-xs text-muted-foreground">{actor.id.slice(0, 16) || "—"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
