/**
 * Tour discount resolution — the single place that decides what a customer
 * pays (§10: centralize cross-cutting concerns). Every price consumer (cards,
 * detail JSON-LD, booking totals, lead emails, catalog sort/filter) goes
 * through `resolvePricing`; never inline the discount rules elsewhere.
 *
 * A discount is ACTIVE when a type + value are set and `now` falls inside the
 * optional startsAt…endsAt window. FIXED = the discounted per-person price;
 * PERCENT = % off the base price. Anything inconsistent (value missing,
 * discount not lower than base) resolves to "no discount" defensively.
 */

export type DiscountType = "FIXED" | "PERCENT";

export interface DiscountFields {
  basePrice: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
}

export interface ResolvedPricing {
  /** Original per-person price (struck through in the UI when discounted). */
  basePrice: number;
  /** What the customer actually pays per person. */
  effectivePrice: number;
  /** Rounded percent saved (e.g. 17), or null when no discount is active. */
  discountPercent: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function resolvePricing(t: DiscountFields, now: Date = new Date()): ResolvedPricing {
  const none: ResolvedPricing = { basePrice: t.basePrice, effectivePrice: t.basePrice, discountPercent: null };

  if (!t.discountType || t.discountValue == null || t.basePrice <= 0) return none;
  if (t.discountStartsAt && now < t.discountStartsAt) return none;
  if (t.discountEndsAt && now > t.discountEndsAt) return none;

  const effectivePrice =
    t.discountType === "PERCENT" ? round2(t.basePrice * (1 - t.discountValue / 100)) : round2(t.discountValue);
  if (effectivePrice <= 0 || effectivePrice >= t.basePrice) return none;

  const discountPercent = Math.round((1 - effectivePrice / t.basePrice) * 100);
  return { basePrice: t.basePrice, effectivePrice, discountPercent };
}
