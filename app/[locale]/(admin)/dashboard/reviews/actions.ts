"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { revalidateContent } from "@/lib/admin/revalidate";
import { reviewSchema, type ReviewInput } from "@/lib/validation/content";

/** Review CRUD (§4/§13). V1 is admin-managed only — no public submission. */

const LIST = "/en/dashboard/reviews";

/** Resolve the optional tour relation; reject dangling ids instead of failing on the FK. */
async function resolveTourId(tourId: string | null): Promise<{ ok: true; tourId: string | null } | { ok: false }> {
  if (!tourId) return { ok: true, tourId: null };
  const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } });
  return tour ? { ok: true, tourId: tour.id } : { ok: false };
}

function toData(r: ReviewInput, tourId: string | null) {
  return {
    tourId,
    customerName: r.customerName,
    customerCountry: r.customerCountry,
    rating: r.rating,
    body: r.body,
    travelDate: r.travelDate ? new Date(`${r.travelDate}T00:00:00Z`) : null,
    language: r.language,
    source: r.source,
    featured: r.featured,
    visible: r.visible,
    displayOrder: r.displayOrder,
  };
}

export async function createReview(input: ReviewInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "reviews", "create");
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const r = parsed.data;

    const tour = await resolveTourId(r.tourId);
    if (!tour.ok) return { ok: false, error: "Selected tour no longer exists." };

    const created = await prisma.review.create({ data: toData(r, tour.tourId) });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Review",
      resourceId: created.id,
      metadata: { summary: `Review by ${r.customerName} created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: created.id };
  } catch (err) {
    return fail("reviews", err);
  }
}

export async function updateReview(id: string, input: ReviewInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "reviews", "edit");
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const r = parsed.data;

    const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Review not found." };

    const tour = await resolveTourId(r.tourId);
    if (!tour.ok) return { ok: false, error: "Selected tour no longer exists." };

    await prisma.review.update({ where: { id }, data: toData(r, tour.tourId) });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Review",
      resourceId: id,
      metadata: { summary: `Review by ${r.customerName} updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("reviews", err);
  }
}

/** Show/hide on the public site — a status change in audit terms (§13). */
export async function setReviewVisible(id: string, visible: boolean): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "reviews", "edit");
    const review = await prisma.review.findUnique({ where: { id }, select: { visible: true, customerName: true } });
    if (!review) return { ok: false, error: "Review not found." };
    if (review.visible === visible) return { ok: true };

    await prisma.review.update({ where: { id }, data: { visible } });
    await logAudit({
      actorId: actor.id,
      actionType: "STATUS_CHANGE",
      resourceType: "Review",
      resourceId: id,
      metadata: { summary: `Review by ${review.customerName} ${visible ? "shown" : "hidden"}` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("reviews", err);
  }
}

export async function setReviewFeatured(id: string, featured: boolean): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "reviews", "edit");
    const review = await prisma.review.findUnique({ where: { id }, select: { featured: true, customerName: true } });
    if (!review) return { ok: false, error: "Review not found." };
    if (review.featured === featured) return { ok: true };

    await prisma.review.update({ where: { id }, data: { featured } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Review",
      resourceId: id,
      metadata: { summary: `Review by ${review.customerName} ${featured ? "featured" : "unfeatured"}` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("reviews", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "reviews", "delete");
  const review = await prisma.review.findUnique({ where: { id }, select: { archivedAt: true, customerName: true } });
  if (!review) return { ok: false, error: "Review not found." };
  if (archive === Boolean(review.archivedAt)) return { ok: true };

  await prisma.review.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "Review",
    resourceId: id,
    metadata: { summary: `Review by ${review.customerName} ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveReview(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("reviews", err);
  }
}

export async function restoreReview(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("reviews", err);
  }
}
