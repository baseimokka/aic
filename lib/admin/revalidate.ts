import { revalidatePath } from "next/cache";

/**
 * Content edits must reflect on the public site, which is statically generated
 * across all 7 locales. Revalidating the [locale] layout re-renders the whole
 * localized subtree on next visit — simple and correct for infrequent,
 * admin-initiated content changes (Phase 1). Also revalidate the specific
 * admin list paths so the dashboard updates immediately.
 */
export function revalidateContent(...adminPaths: string[]): void {
  revalidatePath("/[locale]", "layout");
  for (const path of adminPaths) revalidatePath(path);
}
