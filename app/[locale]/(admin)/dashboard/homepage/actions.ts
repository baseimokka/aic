"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { revalidateContent } from "@/lib/admin/revalidate";
import { homepageSectionSchema, type HomepageSectionInput } from "@/lib/validation/content";

/**
 * Homepage CMS (§9). Sections are keyed structural rows (seeded) — the Content
 * Admin edits their English copy, visibility and order, not their existence.
 */

const LIST = "/en/dashboard/homepage";

export async function updateHomepageSection(id: string, input: HomepageSectionInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "homepage", "edit");
    const parsed = homepageSectionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const s = parsed.data;

    const section = await prisma.homepageSection.findUnique({ where: { id }, select: { key: true } });
    if (!section) return { ok: false, error: "Section not found." };

    await prisma.homepageSection.update({
      where: { id },
      data: {
        enabled: s.enabled,
        translations: {
          upsert: {
            where: { sectionId_locale: { sectionId: id, locale: "en" } },
            create: { locale: "en", heading: s.heading, body: s.body, ctaLabel: s.ctaLabel },
            update: { heading: s.heading, body: s.body, ctaLabel: s.ctaLabel },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "HomepageSection",
      resourceId: id,
      metadata: { summary: `Homepage section “${section.key}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("homepage", err);
  }
}

/** Quick visibility toggle from the section list (status change on the site). */
export async function setHomepageSectionEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "homepage", "edit");
    const section = await prisma.homepageSection.findUnique({ where: { id }, select: { key: true, enabled: true } });
    if (!section) return { ok: false, error: "Section not found." };
    if (section.enabled === enabled) return { ok: true };

    await prisma.homepageSection.update({ where: { id }, data: { enabled } });
    await logAudit({
      actorId: actor.id,
      actionType: "STATUS_CHANGE",
      resourceType: "HomepageSection",
      resourceId: id,
      metadata: { summary: `Homepage section “${section.key}” ${enabled ? "shown" : "hidden"}` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("homepage", err);
  }
}
