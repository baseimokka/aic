import { z } from "zod";
import type { FieldValues, TranslatableEntityConfig } from "./registry";

/**
 * Build the Zod validator for one entity's translation payload. The SAME rules
 * apply to every locale: required (NOT-NULL) fields must be present; optional
 * fields collapse empty → null (partial saves welcome). English is authored via
 * the entity's own form; this validates the manual per-locale editor writes.
 */
export function buildTranslationSchema(config: TranslatableEntityConfig) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of config.fields) {
    if (field.kind === "list") {
      shape[field.name] = z
        .array(z.string().trim().min(1).max(field.max))
        .max(60)
        .default([]);
    } else if (field.required) {
      shape[field.name] = z
        .string()
        .trim()
        .min(1, `${field.label} is required.`)
        .max(field.max, `${field.label} is too long.`);
    } else {
      shape[field.name] = z.preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? null : v),
        z.string().trim().max(field.max, `${field.label} is too long.`).nullable(),
      );
    }
  }
  return z.object(shape);
}

/**
 * Is there anything worth saving? Used for all-optional types (e.g. homepage
 * sections) so we don't create an empty row that shadows the English fallback.
 */
export function hasAnyContent(config: TranslatableEntityConfig, values: FieldValues): boolean {
  return config.fields.some((f) => {
    const v = values[f.name];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.trim().length > 0;
  });
}
