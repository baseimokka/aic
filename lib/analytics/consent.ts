/**
 * GDPR consent state shared by the cookie banner and the GA4 loader (Phase 7,
 * PRD §24). Analytics must not fire until consent === "accepted". The banner
 * writes the choice and broadcasts an event so GA4 can initialise in the same
 * session without a reload; on reject nothing is ever loaded.
 */
export const CONSENT_KEY = "aic-cookie-consent";
export const CONSENT_EVENT = "aic-consent-change";

export type ConsentValue = "accepted" | "rejected";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}

/** Subscribe to consent changes (same-tab event + cross-tab storage) for useSyncExternalStore. */
export function subscribeConsent(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Server / first-hydration snapshot — deliberately neither "accepted" nor null
 * so the banner never flashes for visitors who already chose (the real value
 * resolves after hydration) and analytics never load during SSR.
 */
export const CONSENT_SSR = "ssr" as const;
export function getServerConsent(): typeof CONSENT_SSR {
  return CONSENT_SSR;
}
