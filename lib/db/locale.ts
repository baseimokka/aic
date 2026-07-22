import { defaultLocale, type Locale } from "@/lib/i18n/config";

/**
 * The one place the locale-fallback rule lives (§5, §7).
 * Given a list of translation rows, return the requested locale's row,
 * else the English (`en`) row, else undefined.
 */
export function resolveTranslation<T extends { locale: string }>(
  translations: readonly T[],
  locale: Locale,
): T | undefined {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale)
  );
}
