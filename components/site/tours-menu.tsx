"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ToursMenuItem {
  href: string;
  label: string;
}

/**
 * "Tours" nav item with a category dropdown (desktop). The trigger stays a
 * real link to the catalog — hover or focus reveals the panel, so pointer,
 * keyboard and touch users all keep a working path to /tours.
 *
 * Interaction contract:
 * - Opens on hover / focus-within; a short close delay forgives the diagonal
 *   move from trigger to panel (plus an invisible hover bridge over the gap).
 * - Escape closes and returns focus to the trigger.
 * - ArrowDown on the trigger opens the panel and focuses the first category.
 * - The panel is kept in the DOM and hidden with visibility, so the open/close
 *   fade + rise can animate both ways and hidden links are never tabbable.
 * - Logical properties only (start/end) — mirrors cleanly for Arabic RTL.
 */
export function ToursMenu({
  href,
  label,
  items,
  allToursLabel,
}: {
  href: string;
  label: string;
  items: ToursMenuItem[];
  allToursLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<number | null>(null);

  // Route change (a category was picked) → the panel's job is done. Adjusted
  // during render (React's derive-from-prop pattern, same as ChallengeCheckbox)
  // rather than in an effect, avoiding a cascading post-commit render.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  // No categories yet → behave exactly like the plain NavLink it replaces.
  if (items.length === 0) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative py-1 text-sm transition-colors",
          active ? "font-semibold text-accent" : "font-medium text-ink hover:text-accent-deep",
        )}
      >
        {label}
        {active && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded bg-accent" />}
      </Link>
    );
  }

  function openNow() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeSoon() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <Link
        ref={triggerRef}
        href={href}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => {
              rootRef.current?.querySelector<HTMLAnchorElement>("[data-menu-item]")?.focus();
            });
          }
        }}
        className={cn(
          "relative flex items-center gap-1 py-1 text-sm transition-colors",
          active ? "font-semibold text-accent" : "font-medium text-ink hover:text-accent-deep",
        )}
      >
        {label}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={cn("transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {active && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded bg-accent" />}
      </Link>

      {/* before: = invisible hover bridge over the trigger→panel gap. */}
      <div
        id={panelId}
        className={cn(
          "absolute start-0 top-full z-50 mt-3 w-64 rounded-2xl border border-line bg-white p-2 shadow-pop",
          "before:absolute before:inset-x-0 before:-top-3 before:h-3",
          "transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0",
        )}
      >
        <ul className="max-h-[min(28rem,70vh)] overflow-y-auto">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                data-menu-item
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-soft hover:text-accent-deep"
              >
                <span className="min-w-0 leading-snug">{item.label}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none rtl:-scale-x-100"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-line-soft pt-1">
          <Link
            href={href}
            data-menu-item
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-[13px] font-bold text-accent transition-colors hover:bg-accent-soft hover:text-accent-deep"
          >
            {allToursLabel}
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="shrink-0 rtl:-scale-x-100"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
