import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";

/** Canonical site origin. Set NEXT_PUBLIC_SITE_URL per environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aictravel.com").replace(/\/$/, "");

/**
 * Build canonical + hreflang alternates for a locale-prefixed page.
 * `pathWithoutLocale` is the path after the locale segment, e.g. "/tours/x" or "/".
 */
export function localizedAlternates(locale: Locale, pathWithoutLocale: string) {
  const clean = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${SITE_URL}/${l}${clean}`;
  languages["x-default"] = `${SITE_URL}/${defaultLocale}${clean}`;
  return { canonical: `${SITE_URL}/${locale}${clean}`, languages };
}
