"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { revalidateContent } from "@/lib/admin/revalidate";
import { testimonialSchema, type TestimonialInput } from "@/lib/validation/content";

/** Testimonial CRUD (§4/§13). The English quote is the source translation row. */

const LIST = "/en/dashboard/testimonials";

export async function createTestimonial(input: TestimonialInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "testimonials", "create");
    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const t = parsed.data;

    const created = await prisma.testimonial.create({
      data: {
        authorName: t.authorName,
        authorCountry: t.authorCountry,
        avatarPath: t.avatarPath,
        rating: t.rating,
        order: t.order,
        featured: t.featured,
        translations: { create: { locale: "en", quote: t.quote } },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Testimonial",
      resourceId: created.id,
      metadata: { summary: `Testimonial from ${t.authorName} created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: created.id };
  } catch (err) {
    return fail("testimonials", err);
  }
}

export async function updateTestimonial(id: string, input: TestimonialInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "testimonials", "edit");
    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const t = parsed.data;

    const existing = await prisma.testimonial.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Testimonial not found." };

    await prisma.testimonial.update({
      where: { id },
      data: {
        authorName: t.authorName,
        authorCountry: t.authorCountry,
        avatarPath: t.avatarPath,
        rating: t.rating,
        order: t.order,
        featured: t.featured,
        translations: {
          upsert: {
            where: { testimonialId_locale: { testimonialId: id, locale: "en" } },
            create: { locale: "en", quote: t.quote },
            update: { quote: t.quote },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Testimonial",
      resourceId: id,
      metadata: { summary: `Testimonial from ${t.authorName} updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("testimonials", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "testimonials", "delete");
  const t = await prisma.testimonial.findUnique({ where: { id }, select: { archivedAt: true, authorName: true } });
  if (!t) return { ok: false, error: "Testimonial not found." };
  if (archive === Boolean(t.archivedAt)) return { ok: true };

  await prisma.testimonial.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "Testimonial",
    resourceId: id,
    metadata: { summary: `Testimonial from ${t.authorName} ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveTestimonial(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("testimonials", err);
  }
}

export async function restoreTestimonial(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("testimonials", err);
  }
}
