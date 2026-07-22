"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { slugify, ensureUniqueSlug } from "@/lib/admin/slug";
import { revalidateContent } from "@/lib/admin/revalidate";
import { blogPostSchema, type BlogPostInput } from "@/lib/validation/content";

/**
 * Blog post CRUD (§9). Blog is English-only (§21) — a single `en` translation
 * row per post; no other locales are generated.
 */

const LIST = "/en/dashboard/blog";

async function resolveSlug(title: string, provided: string | undefined, excludeId?: string): Promise<string> {
  const base = slugify(provided || title);
  return ensureUniqueSlug(base, async (slug) => {
    const hit = await prisma.blogPost.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(hit);
  });
}

export async function createBlogPost(input: BlogPostInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "blog", "create");
    const parsed = blogPostSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const p = parsed.data;

    const slug = await resolveSlug(p.title, p.slug);
    const post = await prisma.blogPost.create({
      data: {
        slug,
        categoryId: p.categoryId,
        featured: p.featured,
        published: p.published,
        publishedAt: p.published ? new Date() : null,
        coverImagePath: p.coverImagePath,
        translations: {
          create: {
            locale: "en",
            title: p.title,
            excerpt: p.excerpt,
            body: p.body,
            seoTitle: p.seoTitle,
            metaDescription: p.metaDescription,
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "BlogPost",
      resourceId: post.id,
      metadata: { summary: `Blog post “${p.title}” created${p.published ? " and published" : " as draft"}` },
    });
    revalidateContent(LIST);
    return { ok: true, id: post.id };
  } catch (err) {
    return fail("blog", err);
  }
}

export async function updateBlogPost(id: string, input: BlogPostInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "blog", "edit");
    const parsed = blogPostSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const p = parsed.data;

    const existing = await prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!existing) return { ok: false, error: "Post not found." };

    const slug = await resolveSlug(p.title, p.slug, id);
    // Stamp publishedAt the first time it goes live; keep it thereafter.
    const publishedAt = p.published ? existing.publishedAt ?? new Date() : existing.publishedAt;

    await prisma.blogPost.update({
      where: { id },
      data: {
        slug,
        categoryId: p.categoryId,
        featured: p.featured,
        published: p.published,
        publishedAt,
        coverImagePath: p.coverImagePath,
        translations: {
          upsert: {
            where: { postId_locale: { postId: id, locale: "en" } },
            create: {
              locale: "en",
              title: p.title,
              excerpt: p.excerpt,
              body: p.body,
              seoTitle: p.seoTitle,
              metaDescription: p.metaDescription,
            },
            update: {
              title: p.title,
              excerpt: p.excerpt,
              body: p.body,
              seoTitle: p.seoTitle,
              metaDescription: p.metaDescription,
            },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "BlogPost",
      resourceId: id,
      metadata: { summary: `Blog post “${p.title}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("blog", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "blog", "delete");
  const post = await prisma.blogPost.findUnique({
    where: { id },
    select: { archivedAt: true, translations: { where: { locale: "en" }, select: { title: true } } },
  });
  if (!post) return { ok: false, error: "Post not found." };
  if (archive === Boolean(post.archivedAt)) return { ok: true };

  await prisma.blogPost.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "BlogPost",
    resourceId: id,
    metadata: { summary: `Blog post “${post.translations[0]?.title ?? id}” ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveBlogPost(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("blog", err);
  }
}

export async function restoreBlogPost(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("blog", err);
  }
}
