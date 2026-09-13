import { Link } from "@tanstack/react-router";
import { Moon, Sun, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/lib/use-theme";
import { useAccessibility } from "@/lib/use-accessibility.tsx";
import { useState, useEffect, useRef, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getNotifications, markNotificationRead, handleJoinRequest } from "@/lib/social.functions";

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

interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_id: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({
  inSidebar = false,
  expanded = false,
}: {
  inSidebar?: boolean;
  expanded?: boolean;
}) {
  const { user } = useAuth();
  const { soundCues, customMatchSound } = useAccessibility();
  const getNotifs = useServerFn(getNotifications);
  const markRead = useServerFn(markNotificationRead);
  const runJoinRequest = useServerFn(handleJoinRequest);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const previousUnreadCount = useRef(0);

  const handleAction = async (
    requestId: string,
    action: "approve" | "decline",
    notificationId: string,
  ) => {
    try {
      await runJoinRequest({ data: { requestId, actorId: user?.id || "", action } });
      await handleMarkRead(notificationId);
      toast.success(`Request ${action === "approve" ? "accepted" : "declined"} successfully`);
      void loadNotifications();
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      toast.error(err instanceof Error ? err.message : `Failed to ${action} request`);
      // Fallback: mark notification read so it doesn't get stuck if already processed
      await handleMarkRead(notificationId);
      void loadNotifications();
    }
  };

  const playNotificationSound = useCallback(() => {
    if (soundCues) {
      const audio = customMatchSound ? new Audio(customMatchSound) : new Audio("/match-sound.mp3");
      audio.play().catch(console.error);
    }
  }, [soundCues, customMatchSound]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await getNotifs({ data: { userId: user.id } });
      const newNotifications = (res.notifications || []) as NotificationItem[];
      const newUnreadCount = newNotifications.filter((n) => !n.is_read).length;

      // Play sound if unread count increased
      if (newUnreadCount > previousUnreadCount.current && previousUnreadCount.current > 0) {
        playNotificationSound();
      }

      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
      previousUnreadCount.current = newUnreadCount;
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [user?.id, getNotifs, playNotificationSound]);

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markRead({ data: { notificationId } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        aria-label="Notifications"
        className={`relative flex items-center gap-3 rounded-lg text-foreground transition-all hover:bg-accent active:scale-95 ${
          inSidebar
            ? "w-full px-2.5 py-2.5 text-[13px] font-medium"
            : "border border-border p-2.5"
        }`}
      >
        <Bell className={inSidebar ? "h-5 w-5 shrink-0" : "h-4 w-4"} />
        {inSidebar && (
          <span className={expanded ? "whitespace-nowrap" : "sr-only"}>Notifications</span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
          <div
            className={`absolute top-full z-50 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-lg ${
              inSidebar ? "left-0" : "right-0"
            }`}
          >
            <h3 className="mb-3 text-sm font-semibold text-foreground">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No notifications</p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      notif.is_read ? "border-border bg-background" : "border-primary bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{notif.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{notif.body}</p>
                      </div>
                      {notif.type === "join_request" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(notif.related_id, "approve", notif.id)}
                            className="rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleAction(notif.related_id, "decline", notif.id)}
                            className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="mt-2 text-xs text-muted-foreground hover:text-primary"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function SiteHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          The <span className="text-primary">Intent</span>
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
                <Link
                  to="/auth"
                  className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
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
