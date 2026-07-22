"use server";

import type { TourStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { slugify, ensureUniqueSlug } from "@/lib/admin/slug";
import { revalidateContent } from "@/lib/admin/revalidate";
import {
  tourSchema,
  tourImagesSchema,
  tourFaqSchema,
  type TourInput,
  type TourImageInput,
  type TourFaqInput,
} from "@/lib/validation/content";

/**
 * Tours module (§9) — the flagship content type. Core fields + the English
 * source translation are written by create/update; images and per-tour FAQs
 * are managed as collections on the edit page once the tour exists.
 */

const LIST = "/en/dashboard/tours";
const editUrl = (id: string) => `/en/dashboard/tours/${id}`;

async function resolveSlug(title: string, provided: string | undefined, excludeId?: string): Promise<string> {
  const base = slugify(provided || title);
  return ensureUniqueSlug(base, async (slug) => {
    const hit = await prisma.tour.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    return Boolean(hit);
  });
}

// The form only offers ACTIVE/DISABLED; ARCHIVED is reached via the archive dialog.
function normalizeStatus(status: TourStatus): TourStatus {
  return status === "ARCHIVED" ? "DISABLED" : status;
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Discount columns from validated input; clearing the type clears the rest. */
function discountData(t: TourInput) {
  return {
    discountType: t.discountType,
    discountValue: t.discountType ? t.discountValue : null,
    discountStartsAt: t.discountType ? toDate(t.discountStartsAt) : null,
    discountEndsAt: t.discountType ? toDate(t.discountEndsAt) : null,
  };
}

export async function createTour(input: TourInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "create");
    const parsed = tourSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const t = parsed.data;

    const slug = await resolveSlug(t.title, t.slug);
    const tour = await prisma.tour.create({
      data: {
        slug,
        categoryId: t.categoryId,
        destinationId: t.destinationId,
        durationDays: t.durationDays,
        basePrice: t.basePrice,
        currency: t.currency,
        ...discountData(t),
        tourType: t.tourType,
        pickupType: t.pickupType,
        cancellationPolicy: t.cancellationPolicy,
        guideLanguages: t.guideLanguages,
        familyFriendly: t.familyFriendly,
        coupleFriendly: t.coupleFriendly,
        soloFriendly: t.soloFriendly,
        featured: t.featured,
        popularityScore: t.popularityScore,
        status: normalizeStatus(t.status),
        translations: {
          create: {
            locale: "en",
            title: t.title,
            overview: t.overview,
            itinerary: t.itinerary ?? "",
            highlights: t.highlights,
            included: t.included,
            excluded: t.excluded,
            customFacts: t.customFacts,
            seoTitle: t.seoTitle,
            metaDescription: t.metaDescription,
            ogImagePath: t.ogImagePath,
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Tour",
      resourceId: tour.id,
      metadata: { summary: `Tour “${t.title}” created` },
    });
    revalidateContent(LIST, editUrl(tour.id));
    return { ok: true, id: tour.id };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function updateTour(id: string, input: TourInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    const parsed = tourSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const t = parsed.data;

    const existing = await prisma.tour.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Tour not found." };

    const slug = await resolveSlug(t.title, t.slug, id);
    await prisma.tour.update({
      where: { id },
      data: {
        slug,
        categoryId: t.categoryId,
        destinationId: t.destinationId,
        durationDays: t.durationDays,
        basePrice: t.basePrice,
        currency: t.currency,
        ...discountData(t),
        tourType: t.tourType,
        pickupType: t.pickupType,
        cancellationPolicy: t.cancellationPolicy,
        guideLanguages: t.guideLanguages,
        familyFriendly: t.familyFriendly,
        coupleFriendly: t.coupleFriendly,
        soloFriendly: t.soloFriendly,
        featured: t.featured,
        popularityScore: t.popularityScore,
        status: normalizeStatus(t.status),
        archivedAt: null, // saving the form takes a tour out of the archive
        translations: {
          upsert: {
            where: { tourId_locale: { tourId: id, locale: "en" } },
            create: {
              locale: "en",
              title: t.title,
              overview: t.overview,
              itinerary: t.itinerary ?? "",
              highlights: t.highlights,
              included: t.included,
              excluded: t.excluded,
              customFacts: t.customFacts,
              seoTitle: t.seoTitle,
              metaDescription: t.metaDescription,
              ogImagePath: t.ogImagePath,
            },
            update: {
              title: t.title,
              overview: t.overview,
              itinerary: t.itinerary ?? "",
              highlights: t.highlights,
              included: t.included,
              excluded: t.excluded,
              customFacts: t.customFacts,
              seoTitle: t.seoTitle,
              metaDescription: t.metaDescription,
              ogImagePath: t.ogImagePath,
            },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: id,
      metadata: { summary: `Tour “${t.title}” updated` },
    });
    revalidateContent(LIST, editUrl(id));
    return { ok: true, id };
  } catch (err) {
    return fail("tours", err);
  }
}

async function tourTitle(id: string): Promise<string> {
  const tr = await prisma.tourTranslation.findFirst({ where: { tourId: id, locale: "en" }, select: { title: true } });
  return tr?.title ?? id;
}

export async function archiveTour(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "delete");
    const tour = await prisma.tour.findUnique({ where: { id }, select: { archivedAt: true } });
    if (!tour) return { ok: false, error: "Tour not found." };
    if (tour.archivedAt) return { ok: true };

    await prisma.tour.update({ where: { id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "Tour",
      resourceId: id,
      metadata: { summary: `Tour “${await tourTitle(id)}” archived` },
    });
    revalidateContent(LIST, editUrl(id));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function restoreTour(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "delete");
    const tour = await prisma.tour.findUnique({ where: { id }, select: { archivedAt: true } });
    if (!tour) return { ok: false, error: "Tour not found." };
    if (!tour.archivedAt) return { ok: true };

    // Restore straight back to ACTIVE so the tour reappears on the tours page.
    await prisma.tour.update({ where: { id }, data: { status: "ACTIVE", archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: id,
      metadata: { summary: `Tour “${await tourTitle(id)}” restored` },
    });
    revalidateContent(LIST, editUrl(id));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

// ─────────────────────────── Images ───────────────────────────
/**
 * Add several Media Library assets to a gallery in one call. Selecting from the
 * library is inherently a batch operation, and one round trip keeps it atomic —
 * a partial gallery can't be left behind — with a single audit row.
 */
export async function addTourImages(tourId: string, input: TourImageInput[]): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    const parsed = tourImagesSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the images." };

    const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } });
    if (!tour) return { ok: false, error: "Tour not found." };

    // Skip anything already in this gallery — the same asset may appear in many
    // tours, but twice in one gallery is always a mistake.
    const existing = await prisma.tourImage.findMany({ where: { tourId }, select: { path: true } });
    const used = new Set(existing.map((i) => i.path));
    const fresh = parsed.data.filter((image) => !used.has(image.path));
    if (fresh.length === 0) return { ok: false, error: "Those images are already in this gallery." };

    const max = await prisma.tourImage.aggregate({ where: { tourId }, _max: { sortOrder: true } });
    const start = (max._max.sortOrder ?? -1) + 1;
    await prisma.tourImage.createMany({
      data: fresh.map((image, index) => ({
        tourId,
        path: image.path,
        alt: image.alt,
        sortOrder: start + index,
      })),
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: tourId,
      metadata: {
        summary: `${fresh.length} image${fresh.length === 1 ? "" : "s"} added to tour “${await tourTitle(tourId)}”`,
      },
    });
    revalidateContent(LIST, editUrl(tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function removeTourImage(imageId: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    const image = await prisma.tourImage.findUnique({ where: { id: imageId }, select: { tourId: true } });
    if (!image) return { ok: true };

    await prisma.tourImage.delete({ where: { id: imageId } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: image.tourId,
      metadata: { summary: `Image removed from tour “${await tourTitle(image.tourId)}”` },
    });
    revalidateContent(LIST, editUrl(image.tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function reorderTourImages(tourId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.tourImage.updateMany({ where: { id, tourId }, data: { sortOrder: index } }),
      ),
    );
    revalidateContent(LIST, editUrl(tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

// ─────────────────────────── Per-tour FAQ ───────────────────────────
export async function addTourFaq(tourId: string, input: TourFaqInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    const parsed = tourFaqSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the FAQ." };

    const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } });
    if (!tour) return { ok: false, error: "Tour not found." };

    const max = await prisma.faq.aggregate({ where: { tourId }, _max: { order: true } });
    await prisma.faq.create({
      data: {
        tourId,
        order: (max._max.order ?? -1) + 1,
        translations: { create: { locale: "en", question: parsed.data.question, answer: parsed.data.answer } },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: tourId,
      metadata: { summary: `FAQ added to tour “${await tourTitle(tourId)}”` },
    });
    revalidateContent(LIST, editUrl(tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function updateTourFaq(faqId: string, input: TourFaqInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    const parsed = tourFaqSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the FAQ." };

    const faq = await prisma.faq.findUnique({ where: { id: faqId }, select: { tourId: true } });
    if (!faq?.tourId) return { ok: false, error: "FAQ not found." };

    await prisma.faqTranslation.upsert({
      where: { faqId_locale: { faqId, locale: "en" } },
      create: { faqId, locale: "en", question: parsed.data.question, answer: parsed.data.answer },
      update: { question: parsed.data.question, answer: parsed.data.answer },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: faq.tourId,
      metadata: { summary: `FAQ edited on tour “${await tourTitle(faq.tourId)}”` },
    });
    revalidateContent(LIST, editUrl(faq.tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function removeTourFaq(faqId: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    const faq = await prisma.faq.findUnique({ where: { id: faqId }, select: { tourId: true } });
    if (!faq?.tourId) return { ok: true };

    await prisma.faq.delete({ where: { id: faqId } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Tour",
      resourceId: faq.tourId,
      metadata: { summary: `FAQ removed from tour “${await tourTitle(faq.tourId)}”` },
    });
    revalidateContent(LIST, editUrl(faq.tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}

export async function reorderTourFaqs(tourId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "tours", "edit");
    await prisma.$transaction(
      orderedIds.map((id, index) => prisma.faq.updateMany({ where: { id, tourId }, data: { order: index } })),
    );
    revalidateContent(LIST, editUrl(tourId));
    return { ok: true };
  } catch (err) {
    return fail("tours", err);
  }
}
