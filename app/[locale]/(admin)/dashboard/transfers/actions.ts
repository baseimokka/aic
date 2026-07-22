"use server";

import { revalidatePath } from "next/cache";
import type { TransferRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { transferRequestStatusSchema } from "@/lib/validation/transfer";
import { transferReference } from "@/lib/transfers/reference";
import { TRANSFER_STATUS_LABELS } from "@/lib/transfers/labels";

/**
 * Transfer request mutations (Transfer module) — same spine as the CRM
 * (§4, §11, §13): resolve actor → requirePermission → validate → write →
 * ONE audit row → revalidate. Requests are internal, so only admin paths
 * revalidate.
 */

function revalidateRequest(id: string) {
  revalidatePath("/en/dashboard/transfers");
  revalidatePath(`/en/dashboard/transfers/${id}`);
}

export async function updateTransferStatus(
  id: string,
  status: TransferRequestStatus,
): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferRequests", "edit");
    const next = transferRequestStatusSchema.parse(status);

    const request = await prisma.transferRequest.findUnique({
      where: { id },
      select: { status: true, createdAt: true },
    });
    if (!request) return { ok: false, error: "Transfer request not found." };
    if (request.status === next) return { ok: true };

    await prisma.transferRequest.update({ where: { id }, data: { status: next } });

    await logAudit({
      actorId: actor.id,
      actionType: "STATUS_CHANGE",
      resourceType: "TransferRequest",
      resourceId: id,
      metadata: {
        from: request.status,
        to: next,
        summary: `Transfer ${transferReference(id, request.createdAt)} → ${TRANSFER_STATUS_LABELS[next]}`,
      },
    });
    revalidateRequest(id);
    return { ok: true };
  } catch (err) {
    return fail("transfers", err);
  }
}

/** "Delete" is archive everywhere — restorable, nothing is removed (Addendum §6). */
export async function archiveTransferRequest(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferRequests", "delete");

    const request = await prisma.transferRequest.findUnique({
      where: { id },
      select: { createdAt: true, archivedAt: true },
    });
    if (!request) return { ok: false, error: "Transfer request not found." };
    if (request.archivedAt) return { ok: true };

    await prisma.transferRequest.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "TransferRequest",
      resourceId: id,
      metadata: { summary: `Transfer ${transferReference(id, request.createdAt)} archived` },
    });
    revalidateRequest(id);
    return { ok: true };
  } catch (err) {
    return fail("transfers", err);
  }
}

export async function restoreTransferRequest(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "transferRequests", "delete");

    const request = await prisma.transferRequest.findUnique({
      where: { id },
      select: { createdAt: true, archivedAt: true },
    });
    if (!request) return { ok: false, error: "Transfer request not found." };
    if (!request.archivedAt) return { ok: true };

    await prisma.transferRequest.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "TransferRequest",
      resourceId: id,
      metadata: { summary: `Transfer ${transferReference(id, request.createdAt)} restored from archive` },
    });
    revalidateRequest(id);
    return { ok: true };
  } catch (err) {
    return fail("transfers", err);
  }
}
