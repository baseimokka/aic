"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  locales,
  localeNames,
  localeCookieName,
  localeCookieMaxAge,
  type Locale,
} from "@/lib/i18n/config";
import { LocaleFlag } from "./locale-flag";
import { cn } from "@/lib/utils";

/**
 * Flag + native-name language dropdown. Custom listbox (native <option> can't
 * render flags); keeps keyboard + SR support: arrows move focus, Enter/Space
 * selects, Escape closes and restores focus. Swaps the leading locale segment.
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Map<Locale, HTMLButtonElement>>(new Map());

  // Close on outside pointer-down so the panel never lingers over content.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus to the current locale's option when the list opens.
  useEffect(() => {
    if (open) optionRefs.current.get(current)?.focus();
  }, [open, current]);

  function select(next: Locale) {
    setOpen(false);
    buttonRef.current?.focus();
    if (next === current) return;
    // Persist the explicit choice so bare-path visits resolve to it (mirrors the edge proxy).
    // eslint-disable-next-line react-hooks/immutability -- intentional cookie write in an event handler; document.cookie is a browser API, not component state.
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=${localeCookieMaxAge}; samesite=lax`;
    const rest = pathname.replace(/^\/[^/]+/, "");
    router.push(`/${next}${rest || ""}`);
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    const items = locales.map((l) => optionRefs.current.get(l)).filter(Boolean) as HTMLButtonElement[];
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Language"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-line-input bg-white ps-3 pe-2.5 text-sm font-semibold text-ink"
      >
        <LocaleFlag locale={current} className="h-3.5 w-5" />
        <span>{localeNames[current].native}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className={cn("h-4 w-4 text-muted transition-transform duration-150", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language"
          onKeyDown={onListKeyDown}
          className="absolute end-0 top-full z-50 mt-2 min-w-[11rem] rounded-xl border border-line-soft bg-white p-1.5 shadow-lg"
        >
          {locales.map((l) => (
            <button
              key={l}
              ref={(el) => {
                if (el) optionRefs.current.set(l, el);
                else optionRefs.current.delete(l);
              }}
              type="button"
              role="option"
              aria-selected={l === current}
              onClick={() => select(l)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm font-semibold text-ink hover:bg-cream focus-visible:bg-cream",
                l === current && "bg-cream",
              )}
            >
              <LocaleFlag locale={l} className="h-3.5 w-5" />
              <span className="grow">{localeNames[l].native}</span>
              {l === current && (
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
