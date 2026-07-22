"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { revalidateContent } from "@/lib/admin/revalidate";
import { type ActionResult, fail } from "@/lib/admin/action";
import { transferVehicleSchema, type TransferVehicleInput } from "@/lib/validation/transfer";

/**
 * Transfer vehicle CRUD (Transfer module). Guarded server-side and audited.
 * Vehicles appear on the public transfer form, so the localized public
 * subtree revalidates alongside the admin list (revalidateContent).
 */

const LIST = "/en/dashboard/transfers/vehicles";

export async function createTransferVehicle(input: TransferVehicleInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "create");
    const parsed = transferVehicleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const vehicle = await prisma.transferVehicle.create({
      data: { name: data.name, capacity: data.capacity, active: data.active },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "TransferVehicle",
      resourceId: vehicle.id,
      metadata: { summary: `Transfer vehicle “${data.name}” added` },
    });
    revalidateContent(LIST);
    return { ok: true, id: vehicle.id };
  } catch (err) {
    return fail("transfer-vehicles", err);
  }
}

export async function updateTransferVehicle(id: string, input: TransferVehicleInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "edit");
    const parsed = transferVehicleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const existing = await prisma.transferVehicle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Vehicle not found." };

    await prisma.transferVehicle.update({
      where: { id },
      data: { name: data.name, capacity: data.capacity, active: data.active },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferVehicle",
      resourceId: id,
      metadata: { summary: `Transfer vehicle “${data.name}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("transfer-vehicles", err);
  }
}

export async function archiveTransferVehicle(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "delete");
    const vehicle = await prisma.transferVehicle.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!vehicle) return { ok: false, error: "Vehicle not found." };
    if (vehicle.archivedAt) return { ok: true };

    await prisma.transferVehicle.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "TransferVehicle",
      resourceId: id,
      metadata: { summary: `Transfer vehicle “${vehicle.name}” archived` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("transfer-vehicles", err);
  }
}

export async function restoreTransferVehicle(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "delete");
    const vehicle = await prisma.transferVehicle.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!vehicle) return { ok: false, error: "Vehicle not found." };
    if (!vehicle.archivedAt) return { ok: true };

    await prisma.transferVehicle.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferVehicle",
      resourceId: id,
      metadata: { summary: `Transfer vehicle “${vehicle.name}” restored` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("transfer-vehicles", err);
  }
}
