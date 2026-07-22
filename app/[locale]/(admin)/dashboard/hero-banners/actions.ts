"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { revalidateContent } from "@/lib/admin/revalidate";
import { heroBannerSchema, type HeroBannerInput } from "@/lib/validation/content";

/** Hero Banner CRUD (§9). English headline/subheadline/CTA are the source row. */

const LIST = "/en/dashboard/hero-banners";

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createHeroBanner(input: HeroBannerInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "heroBanners", "create");
    const parsed = heroBannerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const b = parsed.data;

    const banner = await prisma.heroBanner.create({
      data: {
        imagePath: b.imagePath,
        ctaUrl: b.ctaUrl,
        order: b.order,
        enabled: b.enabled,
        showSearch: b.showSearch,
        startsAt: toDate(b.startsAt),
        endsAt: toDate(b.endsAt),
        translations: {
          create: { locale: "en", headline: b.headline, subheadline: b.subheadline, ctaLabel: b.ctaLabel },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "HeroBanner",
      resourceId: banner.id,
      metadata: { summary: `Hero banner “${b.headline}” created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: banner.id };
  } catch (err) {
    return fail("hero-banners", err);
  }
}

export async function updateHeroBanner(id: string, input: HeroBannerInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "heroBanners", "edit");
    const parsed = heroBannerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const b = parsed.data;

    const existing = await prisma.heroBanner.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Hero banner not found." };

    await prisma.heroBanner.update({
      where: { id },
      data: {
        imagePath: b.imagePath,
        ctaUrl: b.ctaUrl,
        order: b.order,
        enabled: b.enabled,
        showSearch: b.showSearch,
        startsAt: toDate(b.startsAt),
        endsAt: toDate(b.endsAt),
        translations: {
          upsert: {
            where: { bannerId_locale: { bannerId: id, locale: "en" } },
            create: { locale: "en", headline: b.headline, subheadline: b.subheadline, ctaLabel: b.ctaLabel },
            update: { headline: b.headline, subheadline: b.subheadline, ctaLabel: b.ctaLabel },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "HeroBanner",
      resourceId: id,
      metadata: { summary: `Hero banner “${b.headline}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("hero-banners", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "heroBanners", "delete");
  const banner = await prisma.heroBanner.findUnique({
    where: { id },
    select: { archivedAt: true, translations: { where: { locale: "en" }, select: { headline: true } } },
  });
  if (!banner) return { ok: false, error: "Hero banner not found." };
  if (archive === Boolean(banner.archivedAt)) return { ok: true };

  await prisma.heroBanner.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "HeroBanner",
    resourceId: id,
    metadata: { summary: `Hero banner “${banner.translations[0]?.headline ?? id}” ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveHeroBanner(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("hero-banners", err);
  }
}

export async function restoreHeroBanner(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("hero-banners", err);
  }
}
