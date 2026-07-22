import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { timeAgo } from "@/lib/utils";
import { eventTile } from "@/components/admin/notification-tile";
import { markAllNotificationsRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const actor = await requireActor();

  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex items-center gap-2.5 border-b border-line-soft px-5 py-4">
          <h2 className="text-[15px] font-extrabold text-ink">Notifications</h2>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-extrabold text-white">
              {unreadCount} new
            </span>
          ) : null}
          {unreadCount > 0 ? (
            <form action={markAllNotificationsRead} className="ms-auto">
              <button type="submit" className="text-xs font-bold text-accent hover:text-accent-deep">
                Mark all read
              </button>
            </form>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            Nothing yet — new leads, status changes and mentions land here.
          </p>
        ) : (
          notifications.map((n) => {
            const tile = eventTile(n.event);
            const unread = !n.readAt;
            return (
              <form key={n.id} action={openNotification.bind(null, n.id)}>
                <button
                  type="submit"
                  className={`flex w-full items-start gap-3.5 border-b border-line-soft px-5 py-4 text-start last:border-b-0 hover:bg-cream ${
                    unread ? "bg-surface-2/60" : ""
                  }`}
                >
                  <span className={`mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${tile.className}`}>
                    {tile.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${unread ? "font-bold text-ink" : "text-ink-soft"}`}>
                      {n.title}
                    </span>
                    {n.body ? <span className="mt-0.5 block text-[13px] text-muted">{n.body}</span> : null}
                    <span className="mt-1 block text-xs text-faint">{timeAgo(n.createdAt)}</span>
                  </span>
                  {unread ? <span aria-hidden className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent" /> : null}
                </button>
              </form>
            );
          })
        )}
      </div>
    </div>
  );
}
