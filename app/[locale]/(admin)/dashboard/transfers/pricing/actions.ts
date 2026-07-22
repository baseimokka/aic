"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { revalidateContent } from "@/lib/admin/revalidate";
import { type ActionResult, fail } from "@/lib/admin/action";
import { transferRouteSchema, type TransferRouteInput } from "@/lib/validation/transfer";

/**
 * Transfer route pricing CRUD (Transfer module). One price per directed
 * (from → to, vehicle) combination; `vehicleId = null` is the any-vehicle
 * default. Duplicates are rejected here across live AND archived rows (the DB
 * unique treats NULL vehicles as distinct, and an archived duplicate must be
 * restored, not re-created). Prices show on the public form → revalidateContent.
 */

const LIST = "/en/dashboard/transfers/pricing";

/** Human label for audit summaries, resolved once per mutation. */
async function routeLabel(fromId: string, toId: string, vehicleId: string | null): Promise<string> {
  const [from, to, vehicle] = await Promise.all([
    prisma.transferLocation.findUnique({ where: { id: fromId }, select: { name: true } }),
    prisma.transferLocation.findUnique({ where: { id: toId }, select: { name: true } }),
    vehicleId
      ? prisma.transferVehicle.findUnique({ where: { id: vehicleId }, select: { name: true } })
      : Promise.resolve(null),
  ]);
  return `${from?.name ?? "?"} → ${to?.name ?? "?"}${vehicle ? ` (${vehicle.name})` : " (any vehicle)"}`;
}

/** Duplicate-route guard: nothing else may price the same (from, to, vehicle). */
async function duplicateRouteError(
  fromId: string,
  toId: string,
  vehicleId: string | null,
  excludeId?: string,
): Promise<string | null> {
  const clash = await prisma.transferRoute.findFirst({
    where: {
      fromLocationId: fromId,
      toLocationId: toId,
      vehicleId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { archivedAt: true },
  });
  if (!clash) return null;
  return clash.archivedAt
    ? "An archived price exists for this route — restore it instead of creating a duplicate."
    : "This route already has a price for that vehicle.";
}

/** Both endpoints (and the vehicle, when set) must exist and not be archived. */
async function referencesError(fromId: string, toId: string, vehicleId: string | null): Promise<string | null> {
  const [from, to, vehicle] = await Promise.all([
    prisma.transferLocation.findFirst({ where: { id: fromId, archivedAt: null }, select: { id: true } }),
    prisma.transferLocation.findFirst({ where: { id: toId, archivedAt: null }, select: { id: true } }),
    vehicleId
      ? prisma.transferVehicle.findFirst({ where: { id: vehicleId, archivedAt: null }, select: { id: true } })
      : Promise.resolve({ id: null }),
  ]);
  if (!from || !to) return "Choose valid pickup and destination locations.";
  if (!vehicle) return "That vehicle is not available.";
  return null;
}

export async function createTransferRoute(input: TransferRouteInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "create");
    const parsed = transferRouteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const invalid = await referencesError(data.fromLocationId, data.toLocationId, data.vehicleId);
    if (invalid) return { ok: false, error: invalid };
    const duplicate = await duplicateRouteError(data.fromLocationId, data.toLocationId, data.vehicleId);
    if (duplicate) return { ok: false, error: duplicate };

    const route = await prisma.transferRoute.create({
      data: {
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        vehicleId: data.vehicleId,
        price: data.price,
        currency: data.currency,
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "TransferRoute",
      resourceId: route.id,
      metadata: { summary: `Transfer price added: ${await routeLabel(data.fromLocationId, data.toLocationId, data.vehicleId)}` },
    });
    revalidateContent(LIST);
    return { ok: true, id: route.id };
  } catch (err) {
    return fail("transfer-pricing", err);
  }
}

export async function updateTransferRoute(id: string, input: TransferRouteInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "edit");
    const parsed = transferRouteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const existing = await prisma.transferRoute.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Route price not found." };

    const invalid = await referencesError(data.fromLocationId, data.toLocationId, data.vehicleId);
    if (invalid) return { ok: false, error: invalid };
    const duplicate = await duplicateRouteError(data.fromLocationId, data.toLocationId, data.vehicleId, id);
    if (duplicate) return { ok: false, error: duplicate };

    await prisma.transferRoute.update({
      where: { id },
      data: {
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        vehicleId: data.vehicleId,
        price: data.price,
        currency: data.currency,
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferRoute",
      resourceId: id,
      metadata: { summary: `Transfer price updated: ${await routeLabel(data.fromLocationId, data.toLocationId, data.vehicleId)}` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("transfer-pricing", err);
  }
}

export async function archiveTransferRoute(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "delete");
    const route = await prisma.transferRoute.findUnique({
      where: { id },
      select: { fromLocationId: true, toLocationId: true, vehicleId: true, archivedAt: true },
    });
    if (!route) return { ok: false, error: "Route price not found." };
    if (route.archivedAt) return { ok: true };

    await prisma.transferRoute.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "TransferRoute",
      resourceId: id,
      metadata: { summary: `Transfer price archived: ${await routeLabel(route.fromLocationId, route.toLocationId, route.vehicleId)}` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("transfer-pricing", err);
  }
}

export async function restoreTransferRoute(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "delete");
    const route = await prisma.transferRoute.findUnique({
      where: { id },
      select: { fromLocationId: true, toLocationId: true, vehicleId: true, archivedAt: true },
    });
    if (!route) return { ok: false, error: "Route price not found." };
    if (!route.archivedAt) return { ok: true };

    // Restoring must not resurrect a duplicate if the route was re-created meanwhile.
    const duplicate = await duplicateRouteError(route.fromLocationId, route.toLocationId, route.vehicleId, id);
    if (duplicate) return { ok: false, error: duplicate };

    await prisma.transferRoute.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferRoute",
      resourceId: id,
      metadata: { summary: `Transfer price restored: ${await routeLabel(route.fromLocationId, route.toLocationId, route.vehicleId)}` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("transfer-pricing", err);
  }
}
