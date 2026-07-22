"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { vehicleSchema, type VehicleInput } from "@/lib/validation/operations";

/**
 * Vehicle CRUD (Operations, Phase 6 — CLAUDE.md §9). Guarded server-side and
 * audited; vehicles are internal to operations, so only the admin list is
 * revalidated.
 */

const LIST = "/en/dashboard/vehicles";

export async function createVehicle(input: VehicleInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "vehicles", "create");
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const vehicle = await prisma.vehicle.create({
      data: { name: data.name, type: data.type, capacity: data.capacity, status: data.status },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Vehicle",
      resourceId: vehicle.id,
      metadata: { summary: `Vehicle “${data.name}” added` },
    });
    revalidatePath(LIST);
    return { ok: true, id: vehicle.id };
  } catch (err) {
    return fail("vehicles", err);
  }
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "vehicles", "edit");
    const parsed = vehicleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const existing = await prisma.vehicle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Vehicle not found." };

    await prisma.vehicle.update({
      where: { id },
      data: { name: data.name, type: data.type, capacity: data.capacity, status: data.status },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Vehicle",
      resourceId: id,
      metadata: { summary: `Vehicle “${data.name}” updated` },
    });
    revalidatePath(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("vehicles", err);
  }
}

export async function archiveVehicle(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "vehicles", "delete");
    const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!vehicle) return { ok: false, error: "Vehicle not found." };
    if (vehicle.archivedAt) return { ok: true };

    await prisma.vehicle.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "Vehicle",
      resourceId: id,
      metadata: { summary: `Vehicle “${vehicle.name}” archived` },
    });
    revalidatePath(LIST);
    return { ok: true };
  } catch (err) {
    return fail("vehicles", err);
  }
}

export async function restoreVehicle(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "vehicles", "delete");
    const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!vehicle) return { ok: false, error: "Vehicle not found." };
    if (!vehicle.archivedAt) return { ok: true };

    await prisma.vehicle.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Vehicle",
      resourceId: id,
      metadata: { summary: `Vehicle “${vehicle.name}” restored` },
    });
    revalidatePath(LIST);
    return { ok: true };
  } catch (err) {
    return fail("vehicles", err);
  }
}
