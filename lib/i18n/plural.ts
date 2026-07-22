/**
 * Locale-aware day-count formatting for the UI string catalogs.
 *
 * Catalog sections carry the CLDR plural forms as flat keys (`dayOne`,
 * `dayTwo`, `dayFew`, `dayMany`, `days` = "other"); Intl.PluralRules picks the
 * right one per locale (ru: 2–4 → few; ar: 3–10 → few; en/de/fr/it: one/other;
 * tr: no change after numerals). English defines every key, so locales that
 * need fewer forms simply repeat the plural (deep-merge falls back to `en`).
 */
export interface DayForms {
  dayOne: string;
  dayTwo: string;
  dayFew: string;
  dayMany: string;
  /** CLDR "other" — also the legacy always-plural key. */
  days: string;
}

export function formatDayCount(n: number, locale: string, forms: DayForms): string {
  let category: Intl.LDMLPluralRule = "other";
  try {
    category = new Intl.PluralRules(locale).select(n);
  } catch {
    // Unknown locale tag — fall through to "other".
  }
  const form =
    category === "one" ? forms.dayOne
    : category === "two" ? forms.dayTwo
    : category === "few" ? forms.dayFew
    : category === "many" ? forms.dayMany
    : forms.days;
  return `${n} ${form}`;
}
