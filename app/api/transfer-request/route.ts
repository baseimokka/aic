import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { transferRequestSchema } from "@/lib/validation/transfer";
import { verifyChallenge } from "@/lib/security/challenge";
import { challengeKeys } from "@/lib/security/request";
import { honeypotTripped, throttleResponse } from "@/lib/security/public-form";
import { transferReference } from "@/lib/transfers/reference";
import { resolveTransferPrice } from "@/lib/transfers/pricing";
import { notifyUsers, idsByRole } from "@/lib/notifications/notify";
import { sendOpsNotification } from "@/lib/email/notify";
import { transferRequestEmail } from "@/lib/email/templates";
import { formatMoney } from "@/lib/utils";

/**
 * Public transfer request (Transfer module — mirrors the booking-request spine,
 * §8/§11): Zod-validated, honeypot + challenge + rate limit, creates a
 * TransferRequest with status NEW, notifies the sales team via Resend.
 * The price is re-resolved server-side and snapshotted — the client-displayed
 * figure is never trusted. No audit entry — §13 logs administrative mutations only.
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

  const parsed = transferRequestSchema.safeParse(body);
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

  // Resolve vehicle and locations server-side. Anything deactivated or archived
  // while the visitor had the page open is rejected so they can re-choose,
  // instead of silently creating an unfulfillable request.
  const [vehicle, fromLocation, toLocation] = await Promise.all([
    prisma.transferVehicle.findFirst({
      where: { id: data.vehicleId, active: true, archivedAt: null },
      select: { id: true, name: true, capacity: true },
    }),
    prisma.transferLocation.findFirst({
      where: { id: data.fromLocationId, active: true, archivedAt: null },
      select: { id: true, name: true },
    }),
    prisma.transferLocation.findFirst({
      where: { id: data.toLocationId, active: true, archivedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  if (!vehicle || !fromLocation || !toLocation) {
    return NextResponse.json({ ok: false, error: "route_unavailable" }, { status: 409 });
  }
  if (data.passengers > vehicle.capacity) {
    return NextResponse.json(
      { ok: false, error: "validation", fieldErrors: { passengers: ["Too many passengers for this vehicle."] } },
      { status: 422 },
    );
  }

  // Snapshot the configured price at submission time (may be null = on request).
  const quoted = await resolveTransferPrice(fromLocation.id, toLocation.id, vehicle.id);

  const request = await prisma.transferRequest.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      pickupDate: new Date(`${data.pickupDate}T00:00:00Z`),
      passengers: data.passengers,
      vehicleId: vehicle.id,
      fromLocationId: fromLocation.id,
      toLocationId: toLocation.id,
      notes: data.notes ?? null,
      quotedPrice: quoted?.price ?? null,
      currency: quoted?.currency ?? "USD",
      locale: data.locale ?? "en",
    },
  });

  const reference = transferReference(request.id, request.createdAt);
  const priceLabel = quoted ? formatMoney(quoted.price, quoted.currency) : null;

  // Staff notifications — best-effort, never fail the submission.
  await notifyUsers({
    userIds: await idsByRole("SALES_ADMIN", "SUPER_ADMIN"),
    event: "new_transfer",
    title: `New transfer request · ${reference}`,
    body: `${request.fullName} — ${fromLocation.name} → ${toLocation.name}, ${vehicle.name}, ${request.passengers} passenger(s)${priceLabel ? ` · ${priceLabel}` : ""}.`,
    linkUrl: `/en/dashboard/transfers/${request.id}`,
  });

  // Best-effort: the request is persisted; a failed email must not fail it.
  await sendOpsNotification(
    transferRequestEmail({
      reference,
      fullName: request.fullName,
      email: request.email,
      phone: request.phone,
      pickupDate: data.pickupDate,
      passengers: request.passengers,
      vehicleName: vehicle.name,
      fromName: fromLocation.name,
      toName: toLocation.name,
      priceLabel,
      notes: data.notes,
    }),
  );

  return NextResponse.json({ ok: true, reference, price: quoted?.price ?? null, currency: quoted?.currency ?? null });
}

function fakeReference(): string {
  const noise = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TRF-${new Date().getFullYear()}-${noise}`;
}
