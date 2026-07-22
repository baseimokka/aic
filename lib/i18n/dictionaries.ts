import { isLocale, defaultLocale, type Locale } from "./config";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import de from "@/messages/de.json";
import ru from "@/messages/ru.json";
import tr from "@/messages/tr.json";
import fr from "@/messages/fr.json";
import it from "@/messages/it.json";

/** The UI string catalog shape is derived from the English source. */
export type Dictionary = typeof en;

// Small UI chrome catalogs — statically imported (deterministic; no dynamic-import interop).
const catalogs: Record<Locale, unknown> = { en, ar, de, ru, tr, fr, it };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge locale overrides onto the English base so any missing key falls back to `en`. */
function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base; // key absent in this locale → keep English
  if (!isObject(base) || !isObject(override)) return override as T; // leaf → override wins
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    out[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], override[key]) : override[key];
  }
  return out as T;
}

/**
 * UI chrome strings for a locale, falling back field-by-field to English (§5).
 * Content text (tours, blog, …) comes from translation tables, not from here.
 */
export function getDictionary(locale: string): Dictionary {
  const loc: Locale = isLocale(locale) ? locale : defaultLocale;
  return deepMerge(en, catalogs[loc]);
}

/**
 * Display label for a `Tour.tourType` value. The controlled vocabulary is
 * localized via the `tourTypes` catalog section; any admin-entered value
 * outside it falls back to the raw string (tourType stays free text — §PRD).
 */
export function tourTypeLabel(t: Dictionary, value: string): string {
  return (t.tourTypes as Record<string, string>)[value] ?? value;
}
