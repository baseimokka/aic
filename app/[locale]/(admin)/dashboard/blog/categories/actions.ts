"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { slugify, ensureUniqueSlug } from "@/lib/admin/slug";
import { revalidateContent } from "@/lib/admin/revalidate";
import { blogCategorySchema, type BlogCategoryInput } from "@/lib/validation/content";

/** Blog category CRUD (English-only taxonomy). */

const LIST = "/en/dashboard/blog/categories";

async function resolveSlug(name: string, provided: string | undefined, excludeId?: string): Promise<string> {
  const base = slugify(provided || name);
  return ensureUniqueSlug(base, async (slug) => {
    const hit = await prisma.blogCategory.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(hit);
  });
}

export async function createBlogCategory(input: BlogCategoryInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "blog", "create");
    const parsed = blogCategorySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const c = parsed.data;

    const slug = await resolveSlug(c.name, c.slug);
    const category = await prisma.blogCategory.create({ data: { name: c.name, slug } });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "BlogCategory",
      resourceId: category.id,
      metadata: { summary: `Blog category “${c.name}” created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: category.id };
  } catch (err) {
    return fail("blog-categories", err);
  }
}

export async function updateBlogCategory(id: string, input: BlogCategoryInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "blog", "edit");
    const parsed = blogCategorySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const c = parsed.data;

    const existing = await prisma.blogCategory.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Category not found." };

    const slug = await resolveSlug(c.name, c.slug, id);
    await prisma.blogCategory.update({ where: { id }, data: { name: c.name, slug } });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "BlogCategory",
      resourceId: id,
      metadata: { summary: `Blog category “${c.name}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("blog-categories", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "blog", "delete");
  const category = await prisma.blogCategory.findUnique({ where: { id }, select: { archivedAt: true, name: true } });
  if (!category) return { ok: false, error: "Category not found." };
  if (archive === Boolean(category.archivedAt)) return { ok: true };

  await prisma.blogCategory.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "BlogCategory",
    resourceId: id,
    metadata: { summary: `Blog category “${category.name}” ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveBlogCategory(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("blog-categories", err);
  }
}

export async function restoreBlogCategory(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("blog-categories", err);
  }
}
