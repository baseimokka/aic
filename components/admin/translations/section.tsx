import { getCurrentActor } from "@/lib/auth/session";
import { can } from "@/lib/rbac/matrix";
import { translationTabOrder } from "@/lib/i18n/config";
import { entityConfig, type TranslatableEntityType } from "@/lib/translation/registry";
import { loadEntityLocales } from "@/lib/translation/db";
import { computeCoverage, type LocaleCoverage } from "@/lib/translation/coverage";
import { TranslationEditor } from "./editor";

/**
 * Drop-in Translations section for any entity edit page. Loads the English
 * source + per-locale coverage server-side (content itself is fetched lazily by
 * the editor, one locale at a time) and renders the reusable editor. Hidden from
 * roles that cannot even view the underlying content; read-only unless the actor
 * has translations:edit (Super Admin / Content Admin).
 */
export async function TranslationsSection({
  entityType,
  entityId,
}: {
  entityType: TranslatableEntityType;
  entityId: string;
}) {
  const actor = await getCurrentActor();
  if (!actor) return null;

  const config = entityConfig(entityType);
  if (!can(actor.role, config.rbacResource, "view")) return null;

  const canEdit = can(actor.role, "translations", "edit");
  const byLocale = await loadEntityLocales(entityType, entityId);

  const coverage: Record<string, LocaleCoverage> = {};
  for (const l of translationTabOrder) {
    coverage[l] = computeCoverage(config, byLocale[l] ?? null);
  }

  // Preload the default target language so the editor opens without a fetch;
  // the other locales are loaded lazily by the editor when their tab is opened.
  const initialLocale = translationTabOrder.find((l) => l !== "en") ?? "ar";

  return (
    <TranslationEditor
      entityType={entityType}
      entityId={entityId}
      englishValues={byLocale.en ?? {}}
      initialLocale={initialLocale}
      initialValues={byLocale[initialLocale] ?? {}}
      initialCoverage={coverage}
      canEdit={canEdit}
    />
  );
}
