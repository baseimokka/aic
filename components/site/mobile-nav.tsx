"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Sub-links (e.g. tour categories) — the row gains an expand toggle. */
  children?: NavItem[];
}

export function MobileNav({
  items,
  cta,
  locale,
  whatsappLabel,
  partnerRole,
}: {
  items: NavItem[];
  cta: NavItem;
  locale: string;
  whatsappLabel: string;
  partnerRole: string;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const links = items;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-ink text-white"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 top-[71px] z-50 overflow-y-auto bg-navy text-white">
            <nav className="mx-auto flex max-w-[1360px] flex-col px-6 pb-8 pt-2">
              {links.map((l) => {
                const active = l.href === `/${locale}` ? pathname === l.href : pathname.startsWith(l.href);
                const rowCls = cn(
                  "py-3.5 text-xl font-medium",
                  active ? "font-semibold text-gold" : "text-[color:rgba(255,255,255,0.92)]",
                );

                if (!l.children?.length) {
                  return (
                    <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cn(rowCls, "border-b border-white/10")}>
                      {l.label}
                    </Link>
                  );
                }

                // Expandable group: the label still navigates; the chevron
                // toggles a sublist that animates open via grid-template-rows
                // (height-agnostic, RTL-safe, no JS measurement).
                const isExpanded = expanded === l.href;
                const sublistId = `mobile-sub-${l.href.replace(/\W+/g, "-")}`;
                return (
                  <div key={l.href} className="border-b border-white/10">
                    <div className="flex items-center">
                      <Link href={l.href} onClick={() => setOpen(false)} className={cn(rowCls, "min-w-0 flex-1")}>
                        {l.label}
                      </Link>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={sublistId}
                        aria-label={l.label}
                        onClick={() => setExpanded(isExpanded ? null : l.href)}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-white/80"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                          className={cn("transition-transform duration-300 motion-reduce:transition-none", isExpanded && "rotate-180")}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                    <div
                      id={sublistId}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="flex flex-col pb-2">
                          {l.children.map((c) => (
                            <Link
                              key={c.href}
                              href={c.href}
                              onClick={() => setOpen(false)}
                              tabIndex={isExpanded ? undefined : -1}
                              className="border-s-2 border-white/15 py-3 ps-5 text-[17px] text-white/80 hover:text-gold"
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Link
                href={cta.href}
                onClick={() => setOpen(false)}
                className="mt-5 flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-bold text-white"
              >
                {cta.label}
              </Link>
              <a
                href="https://wa.me/201221416299"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp px-6 font-bold text-white"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                  <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
                </svg>
                {whatsappLabel}
              </a>

              <div className="mt-6 flex items-center gap-2.5 border-t border-white/10 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:rgba(255,255,255,0.5)]">
                  {partnerRole}
                </span>
                <span className="rounded-md bg-cream px-2 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/soholidays-logo.png" alt="SoHolidays" width={298} height={96} className="h-[16px] w-auto" />
                </span>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}
