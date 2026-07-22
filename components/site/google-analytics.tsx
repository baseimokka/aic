"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { getConsent, getServerConsent, subscribeConsent } from "@/lib/analytics/consent";

/**
 * GA4, consent-gated (PRD §24 / §15). gtag is not loaded at all until the
 * visitor has accepted cookies; accepting from the banner initialises it in the
 * same session via the consent store (no reload). IP is anonymised. Rendered
 * only when NEXT_PUBLIC_GA_ID is configured (see the site layout).
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const consent = useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
  if (consent !== "accepted") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
