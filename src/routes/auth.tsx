import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

async function clearSupabaseAuthCache() {
  if (typeof window === "undefined") return;

  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Ignore sign-out errors and continue clearing local auth storage.
  }

  const clearStorage = (storage: Storage | null) => {
    if (!storage) return;
    for (const key of Array.from({ length: storage.length }, (_, index) => storage.key(index) || "")) {
      if (!key) continue;
      if (key.startsWith("sb-") || key.startsWith("supabase.auth.")) {
        storage.removeItem(key);
      }
    }
  };

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}

function getAuthErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "Authentication failed.");
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed") || normalized.includes("confirm your email")) {
    return "This account exists, but it still needs email confirmation. Check your inbox and try again after confirming.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Those login details did not match. If you just created an account, confirm the email first or try password recovery.";
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return "An account with that email already exists. Please sign in instead, or use password recovery if you do not remember your password.";
  }

  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (data.user) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      if (error) {
        console.warn("Auth check failed, clearing cached session state:", error);
      }

      void clearSupabaseAuthCache();
    });
  }, [navigate]);

  async function signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await clearSupabaseAuthCache();
      throw error;
    }
    if (!data.session || !data.user) {
      await clearSupabaseAuthCache();
      throw new Error("Sign-in did not complete. Please try again.");
    }
    return data;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });

        if (error) {
          const normalized = error.message.toLowerCase();
          if (normalized.includes("user already registered") || normalized.includes("already registered")) {
            await signInWithPassword(email, password);
            toast.success("Welcome back — your account is ready.");
            navigate({ to: "/dashboard", replace: true });
            return;
          }

          await clearSupabaseAuthCache();
          throw error;
        }

        if (data.user && !data.session) {
          await clearSupabaseAuthCache();
          toast.success("Account created. Please confirm your email before signing in.");
          return;
        }

        toast.success("Account created — welcome in.");
      } else {
        await signInWithPassword(email, password);
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) {
        await clearSupabaseAuthCache();
        toast.error("Google sign-in failed.");
        return;
      }
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch {
      await clearSupabaseAuthCache();
      toast.error("Google sign-in failed.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative w-full max-w-md animate-fade-in">
        <Link
          to="/"
          className="mb-8 block text-center text-2xl font-bold tracking-tight text-foreground"
        >
          Social<span className="text-primary">Discovery</span>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-7 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to declare intents and land in live rooms."
              : "One account. No feed, no followers — just intent."}
          </p>

          <button
            onClick={onGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-accent active:scale-[0.98]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or {mode === "signin" ? "sign in" : "sign up"} with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                maxLength={24}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none transition-colors focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
        <p className="mt-6 text-center font-mono-label text-xs text-muted-foreground">
          policy-gated · audit-chained · sd-v0.2
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}
