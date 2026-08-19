import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback or email confirmation
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          navigate({ to: "/auth", replace: true });
          return;
        }

        if (data.session) {
          // User is authenticated, redirect to dashboard
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        // Try to get session from URL hash (for OAuth/email confirmation)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          // Set the session from the URL params
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Session set error:", sessionError);
            navigate({ to: "/auth", replace: true });
            return;
          }

          if (sessionData.session) {
            navigate({ to: "/dashboard", replace: true });
            return;
          }
        }

        // No valid session, redirect to auth
        navigate({ to: "/auth", replace: true });
      } catch (err) {
        console.error("Auth callback failed:", err);
        navigate({ to: "/auth", replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Confirming your email...</p>
      </div>
    </div>
  );
}
