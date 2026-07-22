"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import {
  markAllNotificationsRead,
  openNotification,
} from "@/app/[locale]/(admin)/dashboard/notifications/actions";
import { eventTile } from "@/components/admin/notification-tile";
import { IconBell } from "@/components/admin/icons";

export interface BellItem {
  id: string;
  event: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsBell({
  unreadCount,
  items,
}: {
  unreadCount: number;
  items: BellItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-[9px] border-[1.5px] border-line-input bg-white text-ink-soft hover:bg-cream"
      >
        <IconBell width={19} height={19} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute end-[9px] top-2 h-2 w-2 rounded-full border-[1.5px] border-white bg-accent"
          />
        ) : null}
      </button>

      {open ? (
        <div className="shadow-pop absolute end-0 top-[52px] z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-white">
          <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
            <span className="text-sm font-extrabold text-ink">Notifications</span>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-extrabold text-white">
                {unreadCount} new
              </span>
            ) : null}
            <form action={markAllNotificationsRead} className="ms-auto">
              <button type="submit" className="text-xs font-bold text-accent hover:text-accent-deep">
                Mark all read
              </button>
            </form>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Nothing yet — new leads and updates land here.</p>
            ) : (
              items.map((item) => {
                const tile = eventTile(item.event);
                const unread = !item.readAt;
                return (
                  <form key={item.id} action={openNotification.bind(null, item.id)}>
                    <button
                      type="submit"
                      className={`flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-start hover:bg-cream ${unread ? "bg-surface-2/60" : ""}`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] ${tile.className}`}
                      >
                        {tile.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${unread ? "font-bold text-ink" : "text-ink-soft"}`}>
                          {item.title}
                        </span>
                        {item.body ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{item.body}</span>
                        ) : null}
                        <span className="mt-0.5 block text-xs text-faint">{timeAgo(new Date(item.createdAt))}</span>
                      </span>
                      {unread ? (
                        <span aria-hidden className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                      ) : null}
                    </button>
                  </form>
                );
              })
            )}
          </div>
          <Link
            href="/en/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-line-soft px-4 py-3 text-center text-sm font-bold text-accent hover:bg-cream"
          >
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
