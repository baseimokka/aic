"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import {
  getConsent,
  getServerConsent,
  setConsent,
  subscribeConsent,
  type ConsentValue,
} from "@/lib/analytics/consent";

/**
 * GDPR cookie consent (PRD §24). Analytics (GA4) must not fire until
 * consent === "accepted"; `setConsent` broadcasts the choice so the GA4 loader
 * initialises in the same session (see components/site/google-analytics.tsx).
 * The banner shows only once, after hydration, when no choice has been made.
 * Bottom-centered card matching the design.
 */
export function CookieConsent({ locale, labels }: { locale: string; labels: Dictionary["cookie"] }) {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);

  function choose(value: ConsentValue) {
    setConsent(value);
  }

  if (consent !== null) return null;

  return (
    <div role="dialog" aria-label={labels.title} className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-5 rounded-2xl border border-line bg-white p-5 shadow-lift sm:px-6">
        <div className="min-w-[240px] flex-1">
          <div className="text-[15px] font-bold text-ink">{labels.title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {labels.message}{" "}
            <Link href={`/${locale}/privacy-policy`} className="font-semibold text-accent hover:underline">
              {labels.learnMore}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="h-11 rounded-[10px] border-[1.5px] border-line-input bg-white px-5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            {labels.reject}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="h-11 rounded-[10px] bg-ink px-5 text-sm font-bold text-white hover:brightness-110"
          >
            {labels.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
