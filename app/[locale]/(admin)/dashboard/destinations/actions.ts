"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { slugify, ensureUniqueSlug } from "@/lib/admin/slug";
import { revalidateContent } from "@/lib/admin/revalidate";
import { destinationSchema, type DestinationInput } from "@/lib/validation/content";

/** Destination CRUD (§4/§13). English name/description/SEO are the source row. */

const LIST = "/en/dashboard/destinations";

async function resolveSlug(name: string, provided: string | undefined, excludeId?: string): Promise<string> {
  const base = slugify(provided || name);
  return ensureUniqueSlug(base, async (slug) => {
    const hit = await prisma.destination.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(hit);
  });
}

export async function createDestination(input: DestinationInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "destinations", "create");
    const parsed = destinationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const d = parsed.data;

    const slug = await resolveSlug(d.name, d.slug);
    const destination = await prisma.destination.create({
      data: {
        slug,
        heroImagePath: d.heroImagePath,
        order: d.order,
        featured: d.featured,
        translations: {
          create: {
            locale: "en",
            name: d.name,
            description: d.description,
            seoTitle: d.seoTitle,
            metaDescription: d.metaDescription,
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Destination",
      resourceId: destination.id,
      metadata: { summary: `Destination “${d.name}” created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: destination.id };
  } catch (err) {
    return fail("destinations", err);
  }
}

export async function updateDestination(id: string, input: DestinationInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "destinations", "edit");
    const parsed = destinationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const d = parsed.data;

    const existing = await prisma.destination.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Destination not found." };

    const slug = await resolveSlug(d.name, d.slug, id);
    await prisma.destination.update({
      where: { id },
      data: {
        slug,
        heroImagePath: d.heroImagePath,
        order: d.order,
        featured: d.featured,
        translations: {
          upsert: {
            where: { destinationId_locale: { destinationId: id, locale: "en" } },
            create: {
              locale: "en",
              name: d.name,
              description: d.description,
              seoTitle: d.seoTitle,
              metaDescription: d.metaDescription,
            },
            update: {
              name: d.name,
              description: d.description,
              seoTitle: d.seoTitle,
              metaDescription: d.metaDescription,
            },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Destination",
      resourceId: id,
      metadata: { summary: `Destination “${d.name}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("destinations", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "destinations", "delete");
  const dest = await prisma.destination.findUnique({
    where: { id },
    select: { archivedAt: true, translations: { where: { locale: "en" }, select: { name: true } } },
  });
  if (!dest) return { ok: false, error: "Destination not found." };
  if (archive && dest.archivedAt) return { ok: true };
  if (!archive && !dest.archivedAt) return { ok: true };

  await prisma.destination.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "Destination",
    resourceId: id,
    metadata: { summary: `Destination “${dest.translations[0]?.name ?? id}” ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveDestination(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("destinations", err);
  }
}

export async function restoreDestination(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("destinations", err);
  }
}
