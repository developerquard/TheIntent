import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmailOtpType } from "@supabase/supabase-js";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        // 1. Check if user is already signed in with a valid session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          if (isMounted) {
            toast.success("Welcome back! Signed in successfully.");
            navigate({ to: "/dashboard", replace: true });
          }
          return;
        }

        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Check for auth error returned in URL
        const errorDesc =
          searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          searchParams.get("error") ||
          hashParams.get("error");

        if (errorDesc) {
          throw new Error(decodeURIComponent(errorDesc));
        }

        // 2. Handle PKCE code exchange (Most common in modern Supabase auth)
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data.session) {
            if (isMounted) {
              toast.success("Email verified successfully! Welcome to The Intent.");
              navigate({ to: "/dashboard", replace: true });
            }
            return;
          }
        }

        // 3. Handle token_hash verification (Direct email token flow)
        const tokenHash = searchParams.get("token_hash");
        const otpType = (searchParams.get("type") || "signup") as EmailOtpType;
        if (tokenHash) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (error) throw error;
          if (data.session) {
            if (isMounted) {
              toast.success("Account confirmed successfully!");
              navigate({ to: "/dashboard", replace: true });
            }
            return;
          }
        }

        // 4. Handle implicit access_token & refresh_token from hash
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (data.session) {
            if (isMounted) {
              toast.success("Session verified! Redirecting to dashboard...");
              navigate({ to: "/dashboard", replace: true });
            }
            return;
          }
        }

        // If no tokens found but user is logged in, redirect home
        const { data: finalUserData } = await supabase.auth.getUser();
        if (finalUserData?.user) {
          if (isMounted) {
            navigate({ to: "/dashboard", replace: true });
          }
          return;
        }

        throw new Error(
          "Confirmation link missing parameters or expired. Please sign in or request a new confirmation email.",
        );
      } catch (err) {
        console.error("Auth callback verification error:", err);
        const msg = err instanceof Error ? err.message : "Authentication callback failed.";
        if (isMounted) {
          setErrorMessage(msg);
          setIsProcessing(false);
          toast.error(msg);
        }
      }
    };

    void handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (errorMessage) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-destructive/10 blur-3xl" />
        <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="mt-5 text-xl font-bold text-foreground">Confirmation Link Issue</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{errorMessage}</p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/auth"
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Go to Sign In & Resend Link
            </Link>
            <Link
              to="/"
              className="w-full text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h3 className="text-lg font-semibold text-foreground">Verifying your account...</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Connecting session to The Intent...
        </p>
      </div>
    </div>
  );
}
