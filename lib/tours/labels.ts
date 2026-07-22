import type { CancellationPolicy, PickupType } from "@prisma/client";

/**
 * Human labels for the tour Quick Facts enums — admin selects and summaries.
 * Public-site labels come from the locale string catalogs (`detail.pickupOptions`
 * / `detail.cancellationOptions`), not from here.
 */
export const PICKUP_TYPE_LABELS: Record<PickupType, string> = {
  HOTEL_INCLUDED: "Hotel pickup included",
  AIRPORT_AVAILABLE: "Airport pickup available",
  MEETING_POINT: "Meet at the starting point",
  NOT_INCLUDED: "Pickup not included",
};

export const CANCELLATION_POLICY_LABELS: Record<CancellationPolicy, string> = {
  FREE_24H: "Free cancellation up to 24 hours",
  FREE_48H: "Free cancellation up to 48 hours",
  FREE_72H: "Free cancellation up to 72 hours",
  NON_REFUNDABLE: "Non-refundable",
};

export const PICKUP_TYPES = Object.keys(PICKUP_TYPE_LABELS) as PickupType[];
export const CANCELLATION_POLICIES = Object.keys(CANCELLATION_POLICY_LABELS) as CancellationPolicy[];

/**
 * ISO 639-1 codes offered for a tour's guide languages (site locales plus
 * common visitor languages). Stored as codes on the base table; every locale
 * renders its own display names via Intl.DisplayNames — no translation rows.
 */
export const TOUR_GUIDE_LANGUAGE_CODES = [
  "en",
  "ar",
  "de",
  "fr",
  "it",
  "ru",
  "tr",
  "es",
  "pt",
  "nl",
  "pl",
  "zh",
  "ja",
] as const;
export type TourGuideLanguageCode = (typeof TOUR_GUIDE_LANGUAGE_CODES)[number];

export function isTourGuideLanguage(code: string): code is TourGuideLanguageCode {
  return (TOUR_GUIDE_LANGUAGE_CODES as readonly string[]).includes(code);
}
