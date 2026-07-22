import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { verifyChallenge } from "@/lib/security/challenge";
import { challengeKeys } from "@/lib/security/request";
import { honeypotTripped, throttleResponse } from "@/lib/security/public-form";
import { leadReference } from "@/lib/leads/reference";
import { autoAssignLead } from "@/lib/leads/assignment";
import { notifyUsers, idsByRole } from "@/lib/notifications/notify";
import { sendOpsNotification } from "@/lib/email/notify";
import { bookingRequestEmail } from "@/lib/email/templates";
import { sendBookingConfirmationEmail } from "@/lib/email/booking-confirmation";
import { resolvePricing, type DiscountType } from "@/lib/pricing";

/**
 * Public booking request (CLAUDE.md §8): Zod-validated, honeypot + challenge
 * + rate limit, creates a Lead with status NEW, notifies the team via Resend.
 * No audit entry — §13 logs administrative mutations only.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  // Honeypot: answer like a success so bots learn nothing; nothing is stored.
  if (honeypotTripped(body)) {
    return NextResponse.json({ ok: true, reference: fakeReference() });
  }

  const throttled = throttleResponse(req);
  if (throttled) return throttled;

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;

  if (!(await verifyChallenge(data.challengeToken, challengeKeys(req)))) {
    return NextResponse.json({ ok: false, error: "challenge" }, { status: 400 });
  }

  // Resolve the tour server-side by its stable slug. A booking naming a tour
  // that is no longer bookable (unknown slug, archived, or disabled — e.g.
  // archived while the visitor had the page open) must not silently become a
  // contextless general lead; reject it so the visitor is told and can pick
  // another tour. Slug (not DB id) means a reseed can't spuriously reject a
  // booking submitted from an already-rendered page.
  let tour: {
    id: string;
    slug: string;
    basePrice: unknown;
    discountType: DiscountType | null;
    discountValue: unknown;
    discountStartsAt: Date | null;
    discountEndsAt: Date | null;
    translations: { title: string }[];
    destination: { translations: { name: string }[] } | null;
  } | null = null;
  if (data.tourSlug) {
    tour = await prisma.tour.findFirst({
      where: { slug: data.tourSlug, status: "ACTIVE", archivedAt: null },
      select: {
        id: true,
        slug: true,
        basePrice: true,
        discountType: true,
        discountValue: true,
        discountStartsAt: true,
        discountEndsAt: true,
        translations: { where: { locale: "en" }, select: { title: true } },
        destination: {
          select: { translations: { where: { locale: "en" }, select: { name: true } } },
        },
      },
    });
    if (!tour) {
      return NextResponse.json({ ok: false, error: "tour_unavailable" }, { status: 409 });
    }
  }

  const preferredDate = data.preferredDate ? new Date(data.preferredDate) : null;

  const lead = await prisma.lead.create({
    data: {
      tourId: tour?.id ?? null,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      country: data.country,
      preferredDate: preferredDate && !Number.isNaN(preferredDate.getTime()) ? preferredDate : null,
      adults: data.adults,
      children: data.children,
      hotelName: data.hotelName ?? null,
      roomNumber: data.roomNumber ?? null,
      specialRequests: data.specialRequests ?? null,
      source: data.requestType === "tailor-made" ? "tailor-made" : "booking-request",
      locale: data.locale ?? "en",
    },
  });

  const reference = leadReference(lead.id, lead.createdAt);
  const tourTitle = tour?.translations[0]?.title ?? null;
  const destinationName = tour?.destination?.translations[0]?.name ?? null;

  // Auto-routing + staff notifications (Addendum §2/§6) — best-effort, never
  // fail the submission. Recipients: the assignee plus all Sales Admins.
  const assignment = await autoAssignLead(lead.id, {
    country: lead.country,
    locale: lead.locale,
    tourTitle,
    tourSlug: tour?.slug ?? null,
    // Estimated value honors any active discount — what the customer would pay.
    estValue: tour
      ? resolvePricing({
          basePrice: Number(tour.basePrice),
          discountType: tour.discountType,
          discountValue: tour.discountValue == null ? null : Number(tour.discountValue),
          discountStartsAt: tour.discountStartsAt,
          discountEndsAt: tour.discountEndsAt,
        }).effectivePrice * (lead.adults + lead.children)
      : null,
  });
  await notifyUsers({
    userIds: [assignment?.userId, ...(await idsByRole("SALES_ADMIN"))],
    event: "new_lead",
    title: `New booking request · ${reference}`,
    body: `${lead.fullName} (${lead.country}) requested ${tourTitle ?? (data.requestType === "tailor-made" ? "a tailor-made trip" : "a tour")} — ${lead.adults + lead.children} traveler(s).`,
    linkUrl: `/en/dashboard/leads/${lead.id}`,
  });

  // Best-effort: the lead is persisted; a failed email must not fail the request.
  await sendOpsNotification(
    bookingRequestEmail({
      reference,
      tourTitle: tour?.translations[0]?.title ?? null,
      fullName: lead.fullName,
      // Always present on website submissions (schema-required); the column is
      // nullable only for manually entered leads.
      email: data.email,
      phone: lead.phone,
      country: lead.country,
      preferredDate: data.preferredDate ?? null,
      adults: lead.adults,
      children: lead.children,
      hotelName: data.hotelName,
      roomNumber: data.roomNumber,
      specialRequests: data.specialRequests,
    }),
  );

  // Premium confirmation to the customer — best-effort and self-guarded, so a
  // render/delivery failure never fails the request (the lead is persisted).
  await sendBookingConfirmationEmail({
    reference,
    fullName: lead.fullName,
    tourTitle,
    destinationName,
    email: data.email,
    phone: lead.phone,
    country: lead.country,
    preferredDate: data.preferredDate ?? null,
    adults: lead.adults,
    children: lead.children,
    submittedAt: lead.createdAt,
    locale: lead.locale,
  });

  return NextResponse.json({ ok: true, reference });
}

function fakeReference(): string {
  const noise = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AIC-${new Date().getFullYear()}-${noise}`;
}
