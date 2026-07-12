import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/lib/use-theme";

function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="rounded-xl border border-border p-2.5 text-foreground transition-all hover:bg-accent active:scale-95"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80">
          Social<span className="text-primary">Discovery</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          <a href="/#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="/#brands" className="transition-colors hover:text-foreground">
            For brands
          </a>
          <Link to="/audit" className="transition-colors hover:text-foreground">
            Trust
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!loading &&
            (user ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
              >
                Open dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/auth" className="text-sm font-semibold text-foreground transition-colors hover:text-primary">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
                >
                  Get started
                </Link>
              </div>
            ))}
        </div>
      </div>
    </header>
  );
}
