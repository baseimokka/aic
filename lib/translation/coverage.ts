import type { FieldValue, FieldValues, TranslatableEntityConfig } from "./registry";

/**
 * Translation-coverage maths (pure, shared by server and client). A field is
 * "filled" when it holds real content; coverage is filled/total across all
 * translatable fields for the type. Row existence + required completeness are
 * tracked separately so the UI can show ✓ / partial / missing.
 */

export interface LocaleCoverage {
  /** A translation row exists for this locale. */
  exists: boolean;
  filled: number;
  total: number;
  /** All fields filled. */
  complete: boolean;
  /** Every required field is filled (the translation is usable/publishable). */
  usable: boolean;
  percent: number;
}

export function isFilled(v: FieldValue | undefined): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  return v.trim().length > 0;
}

/** Coverage for one locale given its stored values (or null when no row exists). */
export function computeCoverage(
  config: TranslatableEntityConfig,
  values: FieldValues | null,
): LocaleCoverage {
  const total = config.fields.length;
  if (!values) {
    return { exists: false, filled: 0, total, complete: false, usable: false, percent: 0 };
  }
  let filled = 0;
  let requiredFilled = 0;
  let requiredTotal = 0;
  for (const field of config.fields) {
    const has = isFilled(values[field.name]);
    if (has) filled += 1;
    if (field.required) {
      requiredTotal += 1;
      if (has) requiredFilled += 1;
    }
  }
  return {
    exists: true,
    filled,
    total,
    complete: filled === total,
    usable: requiredFilled === requiredTotal,
    percent: total === 0 ? 100 : Math.round((filled / total) * 100),
  };
}

/** Short human label for a coverage badge: "Complete" · "6/8" · "Missing". */
export function coverageLabel(c: LocaleCoverage): string {
  if (!c.exists || c.filled === 0) return "Missing";
  if (c.complete) return "Complete";
  return `${c.filled}/${c.total}`;
}
