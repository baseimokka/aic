"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { revalidateContent } from "@/lib/admin/revalidate";
import { type ActionResult, fail } from "@/lib/admin/action";
import { transferLocationSchema, type TransferLocationInput } from "@/lib/validation/transfer";

/**
 * Transfer location CRUD (Transfer module). Guarded server-side and audited.
 * Locations appear on the public transfer form, so the localized public
 * subtree revalidates alongside the admin list (revalidateContent).
 */

const LIST = "/en/dashboard/transfers/locations";

export async function createTransferLocation(input: TransferLocationInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "create");
    const parsed = transferLocationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const location = await prisma.transferLocation.create({
      data: { name: data.name, active: data.active },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "TransferLocation",
      resourceId: location.id,
      metadata: { summary: `Transfer location “${data.name}” added` },
    });
    revalidateContent(LIST);
    return { ok: true, id: location.id };
  } catch (err) {
    return fail("transfer-locations", err);
  }
}

export async function updateTransferLocation(id: string, input: TransferLocationInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "edit");
    const parsed = transferLocationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const existing = await prisma.transferLocation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Location not found." };

    await prisma.transferLocation.update({
      where: { id },
      data: { name: data.name, active: data.active },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferLocation",
      resourceId: id,
      metadata: { summary: `Transfer location “${data.name}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("transfer-locations", err);
  }
}

export async function archiveTransferLocation(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "delete");
    const location = await prisma.transferLocation.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!location) return { ok: false, error: "Location not found." };
    if (location.archivedAt) return { ok: true };

    await prisma.transferLocation.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "TransferLocation",
      resourceId: id,
      metadata: { summary: `Transfer location “${location.name}” archived` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("transfer-locations", err);
  }
}

export async function restoreTransferLocation(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferConfig", "delete");
    const location = await prisma.transferLocation.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!location) return { ok: false, error: "Location not found." };
    if (!location.archivedAt) return { ok: true };

    await prisma.transferLocation.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferLocation",
      resourceId: id,
      metadata: { summary: `Transfer location “${location.name}” restored` },
    });
    revalidateContent(LIST);
    return { ok: true };
  } catch (err) {
    return fail("transfer-locations", err);
  }
}
