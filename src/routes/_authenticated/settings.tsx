import { createFileRoute } from "@tanstack/react-router";
import {
  Monitor,
  Moon,
  Sun,
  Palette,
  Bell,
  Check,
  Accessibility,
  Volume2,
  Upload,
  Play,
} from "lucide-react";
import { useState, useRef } from "react";
import { useTheme, type ThemePref } from "@/lib/use-theme";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { useAccessibility } from "@/lib/use-accessibility.tsx";
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
  const {
    reduceMotion,
    reduceBackgroundEffects,
    soundCues,
    customRingtone,
    customMatchSound,
    setReduceMotion,
    setReduceBackgroundEffects,
    setSoundCues,
    setCustomRingtone,
    setCustomMatchSound,
  } = useAccessibility();
  const ringtoneInputRef = useRef<HTMLInputElement>(null);
  const matchSoundInputRef = useRef<HTMLInputElement>(null);

  const handleRingtoneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomRingtone(url);
    }
  };

  const handleMatchSoundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomMatchSound(url);
    }
  };

  const playRingtone = () => {
    if (customRingtone) {
      const audio = new Audio(customRingtone);
      audio.play();
    }
  };

  const playMatchSound = () => {
    if (customMatchSound) {
      const audio = new Audio(customMatchSound);
      audio.play();
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
      <div className="animate-fade-in">
        <p className="font-mono-label text-sm font-medium text-primary">preferences</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground md:text-4xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Personalize how The Intent looks and feels. Changes save instantly.
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
          Currently showing the <span className="font-semibold text-foreground">{resolved}</span>{" "}
          theme.
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
                  "group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors duration-200",
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
                <Icon
                  className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")}
                />
                <span className="font-semibold text-foreground">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accessibility */}
      <section
        className="animate-fade-in mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2">
          <Accessibility className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Accessibility</h2>
        </div>

        <div className="mt-4 divide-y divide-border">
          <ToggleRow
            title="Reduce motion"
            desc="Reduce overall animations while keeping essential transitions."
            checked={reduceMotion}
            onChange={setReduceMotion}
          />
          <ToggleRow
            title="Reduce background effects"
            desc="Disable cursor effects and animated backgrounds completely."
            checked={reduceBackgroundEffects}
            onChange={setReduceBackgroundEffects}
          />
        </div>
      </section>

      {/* Sounds */}
      <section
        className="animate-fade-in mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Sounds</h2>
        </div>

        <div className="mt-4 divide-y divide-border">
          <ToggleRow
            title="Sound cues"
            desc="Play a soft sound when an intent is matched."
            checked={soundCues}
            onChange={setSoundCues}
          />
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="font-semibold text-foreground">Custom ringtone</p>
            <p className="text-sm text-muted-foreground">
              Upload your personal ringtone for room calls.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                ref={ringtoneInputRef}
                type="file"
                accept="audio/*"
                onChange={handleRingtoneUpload}
                className="hidden"
              />
              <button
                onClick={() => ringtoneInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Upload className="h-4 w-4" />
                Upload ringtone
              </button>
              {customRingtone && (
                <button
                  onClick={playRingtone}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Play className="h-4 w-4" />
                  Preview
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="font-semibold text-foreground">Match sound</p>
            <p className="text-sm text-muted-foreground">
              Upload a custom sound for intent matching.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                ref={matchSoundInputRef}
                type="file"
                accept="audio/*"
                onChange={handleMatchSoundUpload}
                className="hidden"
              />
              <button
                onClick={() => matchSoundInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Upload className="h-4 w-4" />
                Upload match sound
              </button>
              {customMatchSound && (
                <button
                  onClick={playMatchSound}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Play className="h-4 w-4" />
                  Preview
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Account */}
      <section
        className="animate-fade-in mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm"
        style={{ animationDelay: "240ms" }}
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
            <dd className="font-mono-label text-xs text-muted-foreground">
              {actor.id.slice(0, 16) || "—"}
            </dd>
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
          "relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-200 ease-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
