import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Zap,
  MessagesSquare,
  Users,
  ShieldCheck,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, actorFromUser } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Intent Engine", to: "/app", icon: Zap },
  { label: "Rooms", to: "/rooms", icon: MessagesSquare },
  { label: "Community", to: "/community", icon: Users, soon: true },
  { label: "Trust", to: "/audit", icon: ShieldCheck },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const actor = actorFromUser(user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative z-10 min-h-screen">
      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-[width] duration-300 ease-out",
          expanded ? "w-64" : "w-[72px]",
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 overflow-hidden px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform duration-300 hover:rotate-6">
            <Zap className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "whitespace-nowrap text-lg font-bold tracking-tight text-sidebar-foreground transition-all duration-300",
              expanded ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
            )}
          >
            Social<span className="text-primary">Discovery</span>
          </span>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1.5 px-3">
          {NAV.map((item, i) => {
            const active =
              pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
                style={{ transitionDelay: expanded ? `${i * 30}ms` : "0ms" }}
              >
                <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span
                  className={cn(
                    "flex-1 whitespace-nowrap transition-all duration-300",
                    expanded ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
                  )}
                >
                  {item.label}
                </span>
                {item.soon && expanded && (
                  <span className="rounded-md bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sidebar-foreground/60">
                    soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 overflow-hidden rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {actor.label ? actor.label[0].toUpperCase() : "•"}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 transition-all duration-300",
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {actor.label || "…"}
              </p>
              <p className="truncate font-mono-label text-xs text-sidebar-foreground/50">
                {actor.id.slice(0, 12)}
              </p>
            </div>
            {expanded && (
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  to="/settings"
                  aria-label="Settings"
                  className="rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  className="rounded-lg p-2 text-sidebar-foreground/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="min-h-screen pl-[72px] pr-[72px]">{children}</main>
    </div>
  );
}
