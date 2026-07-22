"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { slugify, ensureUniqueSlug } from "@/lib/admin/slug";
import { revalidateContent } from "@/lib/admin/revalidate";
import { categorySchema, type CategoryInput } from "@/lib/validation/content";

/** Category CRUD (§4/§13). English name/description are the source translation row. */

const LIST = "/en/dashboard/categories";

async function resolveSlug(name: string, provided: string | undefined, excludeId?: string): Promise<string> {
  const base = slugify(provided || name);
  return ensureUniqueSlug(base, async (slug) => {
    const hit = await prisma.category.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(hit);
  });
}

export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "categories", "create");
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const slug = await resolveSlug(data.name, data.slug);
    const category = await prisma.category.create({
      data: {
        slug,
        order: data.order,
        translations: {
          create: { locale: "en", name: data.name, description: data.description },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Category",
      resourceId: category.id,
      metadata: { summary: `Category “${data.name}” created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: category.id };
  } catch (err) {
    return fail("categories", err);
  }
}

export async function updateCategory(id: string, input: CategoryInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "categories", "edit");
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Category not found." };

    const slug = await resolveSlug(data.name, data.slug, id);
    await prisma.category.update({
      where: { id },
      data: {
        slug,
        order: data.order,
        translations: {
          upsert: {
            where: { categoryId_locale: { categoryId: id, locale: "en" } },
            create: { locale: "en", name: data.name, description: data.description },
            update: { name: data.name, description: data.description },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Category",
      resourceId: id,
      metadata: { summary: `Category “${data.name}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("categories", err);
  }
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "categories", "delete");
    const category = await prisma.category.findUnique({
      where: { id },
      select: { archivedAt: true, translations: { where: { locale: "en" }, select: { name: true } } },
    });
    if (!category) return { ok: false, error: "Category not found." };
    if (category.archivedAt) return { ok: true };

    await prisma.category.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "Category",
      resourceId: id,
      metadata: { summary: `Category “${category.translations[0]?.name ?? id}” archived` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("categories", err);
  }
}

export async function restoreCategory(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "categories", "delete");
    const category = await prisma.category.findUnique({
      where: { id },
      select: { archivedAt: true, translations: { where: { locale: "en" }, select: { name: true } } },
    });
    if (!category) return { ok: false, error: "Category not found." };
    if (!category.archivedAt) return { ok: true };

    await prisma.category.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Category",
      resourceId: id,
      metadata: { summary: `Category “${category.translations[0]?.name ?? id}” restored` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("categories", err);
  }
}
