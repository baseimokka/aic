/**
 * Pure transformation helpers for the legacy → Prisma migration
 * (docs/migration/phase2-migration-plan.md §2, rules G1–G4 and the §4 parsers).
 * No I/O here — everything is deterministic string/number work so re-runs
 * produce identical output (idempotency depends on it).
 */

import type { Locale } from "@prisma/client";

// ─────────────────────────── G1: trim & collapse ───────────────────────────

/** Unicode-trim and collapse internal whitespace runs (incl. tabs/NBSP) to one space. */
export function trimCollapse(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[ \s]+/g, " ").trim();
}

// ─────────────────────────── HTML entity decoding ───────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  szlig: "ß",
  deg: "°",
  euro: "€",
  pound: "£",
  copy: "©",
  reg: "®",
  trade: "™",
  bull: "•",
  middot: "·",
  laquo: "«",
  raquo: "»",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

// ─────────────────────────── G2: HTML → plain text ───────────────────────────

/**
 * Converts legacy CKEditor HTML into plain text with `\n\n` paragraph breaks —
 * the shape the site renders (blog body splits on blank lines; overview is a
 * single paragraph; FAQ answers are plain text).
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = html;
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  // Close of any block element ends a line; list items get their own line.
  s = s.replace(/<\/\s*(p|div|h[1-6]|li|tr|table|ul|ol|blockquote|section)\s*>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  // Per-line tidy, then collapse 3+ newlines into paragraph breaks.
  const lines = s.split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim());
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();
}

/** Plain text with all whitespace (incl. newlines) collapsed to single spaces. */
export function htmlToInline(html: string | null | undefined): string {
  return trimCollapse(htmlToText(html));
}

// ─────────────────────────── G3: HTML list → string[] ───────────────────────────

/**
 * Extracts list items from `<ul><li>…` markup into a clean string array.
 * Fallback for markup without `<li>`: split the plain-text conversion on lines.
 */
export function htmlToList(html: string | null | undefined): string[] {
  if (!html) return [];
  const items: string[] = [];
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length > 0) {
    for (const li of liMatches) {
      const text = htmlToInline(li.replace(/<\/?li[^>]*>/gi, ""));
      if (text) items.push(text);
    }
    return items;
  }
  return htmlToText(html)
    .split("\n")
    .map((l) => trimCollapse(l.replace(/^[•·*-]\s*/, "")))
    .filter(Boolean);
}

// ─────────────────────────── G4: slug pipeline ───────────────────────────

const TRANSLITERATION: Record<string, string> = {
  ä: "a", ö: "o", ü: "u", ß: "ss", æ: "ae", ø: "o", å: "a",
};

/** NFC → transliterate/strip diacritics → lowercase → `[a-z0-9-]` only. */
export function slugify(s: string | null | undefined, maxLen = 80): string {
  if (!s) return "";
  let out = s.normalize("NFC").toLowerCase();
  out = out.replace(/[äöüßæøå]/g, (c) => TRANSLITERATION[c] ?? c);
  out = out.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip remaining diacritics
  out = out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  if (out.length > maxLen) {
    out = out.slice(0, maxLen).replace(/-+$/, "");
    const lastDash = out.lastIndexOf("-");
    if (lastDash > 40) out = out.slice(0, lastDash); // cut on a word boundary when sane
  }
  return out;
}

// ─────────────────────────── Duration parsing (§4.3) ───────────────────────────

/** Parses legacy free-text `Length` ("1 day", "2 days", "3 hours") into whole days. */
export function parseDurationDays(lengthText: string | null | undefined): { days: number; parsed: boolean } {
  const t = trimCollapse(lengthText).toLowerCase();
  if (!t) return { days: 1, parsed: false };
  const dayMatch = t.match(/(\d+)\s*(?:-\s*)?day/);
  if (dayMatch) return { days: Math.max(1, parseInt(dayMatch[1], 10)), parsed: true };
  const nightMatch = t.match(/(\d+)\s*night/);
  if (nightMatch) return { days: Math.max(1, parseInt(nightMatch[1], 10) + 1), parsed: true };
  // "full day" / "half day" and hour/minute trips are single-day by definition.
  if (/(full|whole|entire|half)[\s-]?day/.test(t)) return { days: 1, parsed: true };
  if (/\d+\s*(hour|hr|minute|min)/.test(t)) return { days: 1, parsed: true };
  const bare = t.match(/^(\d+)$/);
  if (bare) return { days: Math.max(1, parseInt(bare[1], 10)), parsed: true };
  return { days: 1, parsed: false };
}

// ─────────────────────────── Itinerary conversion (§5, confirmed) ───────────────────────────

/** Localized "Day" word for itinerary lines (renderer shows it as the card title). */
const DAY_WORD: Partial<Record<Locale, string>> = {
  en: "Day", de: "Tag", fr: "Jour", it: "Giorno", ru: "День",
};

const DAY_MARKER =
  /(?:^|\n)\s*(?:Day|Tag|Jour|Giorno|День)\s*[.:]?\s*(\d+)\s*[\/.:–—-]*\s*/gi;

/**
 * Converts legacy `Description` HTML into the renderer's "one day per line,
 * `Day N :: detail`" itinerary format. Multi-day content splits on its own
 * Day markers; single-day content becomes one `Day 1 :: <full text>` line.
 */
export function buildItinerary(descriptionHtml: string | null | undefined, locale: Locale): string {
  const text = htmlToText(descriptionHtml);
  if (!text) return "";
  const word = DAY_WORD[locale] ?? "Day";

  const markers: { index: number; length: number; day: number }[] = [];
  for (const m of text.matchAll(DAY_MARKER)) {
    markers.push({ index: m.index ?? 0, length: m[0].length, day: parseInt(m[1], 10) });
  }

  if (markers.length < 2) {
    return `${word} 1 :: ${trimCollapse(text)}`;
  }

  const lines: string[] = [];
  const preamble = trimCollapse(text.slice(0, markers[0].index));
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    let detail = trimCollapse(text.slice(start, end));
    if (i === 0 && preamble) detail = `${preamble} ${detail}`.trim();
    if (detail) lines.push(`${word} ${markers[i].day} :: ${detail}`);
  }
  return lines.length > 0 ? lines.join("\n") : `${word} 1 :: ${trimCollapse(text)}`;
}

// ─────────────────────────── Quick-fact enum parsers (§4.3) ───────────────────────────

export function parsePickupType(pickUpPoint: string | null | undefined): "HOTEL_INCLUDED" | null {
  return /hotel/i.test(pickUpPoint ?? "") ? "HOTEL_INCLUDED" : null;
}

export function parseCancellationPolicy(
  text: string | null | undefined,
): "FREE_24H" | "FREE_48H" | "FREE_72H" | "NON_REFUNDABLE" | null {
  const t = htmlToInline(text).toLowerCase();
  if (!t) return null;
  if (/non[- ]?refundable/.test(t)) return "NON_REFUNDABLE";
  if (/72\s*h/.test(t) || /72\s*hour/.test(t)) return "FREE_72H";
  if (/48\s*h/.test(t) || /48\s*hour/.test(t)) return "FREE_48H";
  if (/24\s*h/.test(t) || /24\s*hour/.test(t)) return "FREE_24H";
  return null;
}

/** Maps language names found in legacy `TourGuide` text to ISO codes, filtered by the app's allowed set. */
export function parseGuideLanguages(text: string | null | undefined, allowed: readonly string[]): string[] {
  const t = htmlToInline(text).toLowerCase();
  if (!t) return [];
  const NAME_TO_CODE: Record<string, string> = {
    english: "en", german: "de", deutsch: "de", russian: "ru", "русский": "ru",
    french: "fr", français: "fr", italian: "it", italiano: "it", spanish: "es",
    español: "es", arabic: "ar", polish: "pl", czech: "cs", turkish: "tr",
  };
  const found = new Set<string>();
  for (const [name, code] of Object.entries(NAME_TO_CODE)) {
    if (t.includes(name) && allowed.includes(code)) found.add(code);
  }
  return [...found].sort();
}

// ─────────────────────────── Custom facts assembly (§4.4) ───────────────────────────

export type FactSource = { label: string; value: string | null | undefined };

/**
 * Builds the `customFacts[]` entries ("Label :: Value", ≤200 chars each, ≤12
 * entries — lib/validation caps). Over-long values are truncated with an
 * ellipsis; the caller receives the list of truncated labels for warnings.
 */
export function buildCustomFacts(sources: FactSource[]): { facts: string[]; truncated: string[] } {
  const facts: string[] = [];
  const truncated: string[] = [];
  for (const { label, value } of sources) {
    const v = htmlToInline(value);
    if (!v) continue;
    const prefix = `${label} :: `;
    const budget = 200 - prefix.length;
    let entry = v;
    if (entry.length > budget) {
      entry = `${entry.slice(0, budget - 1).trimEnd()}…`;
      truncated.push(label);
    }
    facts.push(prefix + entry);
    if (facts.length >= 12) break;
  }
  return { facts, truncated };
}

// ─────────────────────────── Discount rule (§4.3) ───────────────────────────

/** en `PriceBeforeDiscount` numeric and > current price ⇒ FIXED discount (value = discounted price). */
export function parseDiscount(
  priceBeforeDiscount: string | null | undefined,
  currentPrice: number,
): { basePrice: number; discountType: "FIXED" | null; discountValue: number | null; note: string | null } {
  const raw = trimCollapse(priceBeforeDiscount);
  if (!raw) return { basePrice: currentPrice, discountType: null, discountValue: null, note: null };
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  if (!m) {
    return { basePrice: currentPrice, discountType: null, discountValue: null, note: `non-numeric PriceBeforeDiscount "${raw}"` };
  }
  const pbd = parseFloat(m[1]);
  if (pbd <= currentPrice) {
    return { basePrice: currentPrice, discountType: null, discountValue: null, note: `PriceBeforeDiscount ${pbd} ≤ price ${currentPrice} — discount skipped` };
  }
  return { basePrice: pbd, discountType: "FIXED", discountValue: currentPrice, note: null };
}

// ─────────────────────────── Generic helpers ───────────────────────────

/** Truncates plain text to `max` chars (ellipsis), reporting whether it cut. */
export function clamp(text: string, max: number): { text: string; cut: boolean } {
  if (text.length <= max) return { text, cut: false };
  return { text: `${text.slice(0, max - 1).trimEnd()}…`, cut: true };
}
