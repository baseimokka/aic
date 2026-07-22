"use server";

import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { revalidateContent } from "@/lib/admin/revalidate";
import { type ActionResult, fail } from "@/lib/admin/action";
import { isLocale } from "@/lib/i18n/config";
import {
  entityConfig,
  isTranslatableEntityType,
  type FieldValues,
} from "./registry";
import { buildTranslationSchema, hasAnyContent } from "./schema";
import { readTranslation, writeTranslation, translationResourceType } from "./db";

/**
 * The two generalized entry points for the Manual Translation system. ONE read
 * and ONE write action serve every content type and every locale — driven by
 * the registry, so no per-language or per-type action duplication. English is
 * the source and is authored through each entity's own form; it is read-only
 * here.
 */

export type GetTranslationResult =
  | { ok: true; exists: boolean; values: FieldValues }
  | { ok: false; error: string };

/** Lazily load one locale's translation (called when a language tab is opened). */
export async function getTranslation(
  entityType: string,
  entityId: string,
  locale: string,
): Promise<GetTranslationResult> {
  try {
    if (!isTranslatableEntityType(entityType)) return { ok: false, error: "Unknown content type." };
    if (!isLocale(locale)) return { ok: false, error: "Unknown language." };
    const config = entityConfig(entityType);

    const actor = await getCurrentActor();
    requirePermission(actor, config.rbacResource, "view");

    const values = await readTranslation(entityType, entityId, locale);
    return { ok: true, exists: values !== null, values: values ?? {} };
  } catch (err) {
    return fail("translations", err) as GetTranslationResult;
  }
}

/**
 * Create or update ONE locale's translation. Saves only the given locale and
 * never touches the others. English is edited via the entity form, so it is
 * rejected here. Super Admin + Content Admin only (translations:edit).
 */
export async function upsertTranslation(
  entityType: string,
  entityId: string,
  locale: string,
  fields: FieldValues,
): Promise<ActionResult> {
  try {
    if (!isTranslatableEntityType(entityType)) return { ok: false, error: "Unknown content type." };
    if (!isLocale(locale)) return { ok: false, error: "Unknown language." };
    if (locale === "en") return { ok: false, error: "Edit English from the content form above." };
    const config = entityConfig(entityType);

    const actor = await getCurrentActor();
    requirePermission(actor, "translations", "edit");

    const parsed = buildTranslationSchema(config).safeParse(fields ?? {});
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the translation fields." };
    }
    const values = parsed.data as FieldValues;

    if (!hasAnyContent(config, values)) {
      return { ok: false, error: "Enter at least one field before saving." };
    }

    const { id, created } = await writeTranslation(entityType, entityId, locale, values);

    await logAudit({
      actorId: actor.id,
      actionType: created ? "CREATE" : "UPDATE",
      resourceType: translationResourceType(entityType),
      resourceId: entityId,
      metadata: {
        summary: `${config.label} ${locale.toUpperCase()} translation ${created ? "created" : "updated"}`,
        locale,
        translationId: id,
      },
    });

    // Reflect the new translation on the statically-generated public site.
    revalidateContent();
    return { ok: true, id };
  } catch (err) {
    return fail("translations", err);
  }
}
