/**
 * Canonical locale set — 7 languages (PO ruling 2026-07-04).
 * English is the source/fallback; Arabic is RTL. Blog is English-only (PRD §21).
 */
export const locales = ["en", "ar", "de", "ru", "tr", "fr", "it"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * Cookie that remembers the visitor's explicit language choice.
 * The edge proxy honours it before Accept-Language; the locale switcher writes it.
 */
export const localeCookieName = "NEXT_LOCALE";
export const localeCookieMaxAge = 60 * 60 * 24 * 365; // 1 year, in seconds

/** Locales that render right-to-left. */
export const rtlLocales: readonly Locale[] = ["ar"] as const;

/** Manual translation targets (everything except the English source). */
export const translationTargets: readonly Locale[] = ["ar", "de", "ru", "tr", "fr", "it"] as const;

/** Blog content exists only under this locale (PRD §6/§21). */
export const blogLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dir(locale: string): "ltr" | "rtl" {
  return (rtlLocales as readonly string[]).includes(locale) ? "rtl" : "ltr";
}

/** Human-readable names for locale switchers (native + English label). */
export const localeNames: Record<Locale, { native: string; english: string }> = {
  en: { native: "English", english: "English" },
  ar: { native: "العربية", english: "Arabic" },
  de: { native: "Deutsch", english: "German" },
  ru: { native: "Русский", english: "Russian" },
  tr: { native: "Türkçe", english: "Turkish" },
  fr: { native: "Français", english: "French" },
  it: { native: "Italiano", english: "Italian" },
};

/** Flag emoji per locale — used by the admin manual-translation UI. */
export const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  ar: "🇸🇦",
  de: "🇩🇪",
  ru: "🇷🇺",
  tr: "🇹🇷",
  fr: "🇫🇷",
  it: "🇮🇹",
};

/** Tab order in the admin translation editor — English (source) first, then the PO's ordering. */
export const translationTabOrder: readonly Locale[] = ["en", "ar", "de", "fr", "it", "ru", "tr"] as const;
