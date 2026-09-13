import { createFileRoute } from "@tanstack/react-router";
import { NotificationBell } from "@/components/site-header";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return <div className="mx-auto w-full px-5 py-8 md:px-8"><NotificationBell page /></div>;
}