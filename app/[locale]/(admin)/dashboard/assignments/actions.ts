"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { assignmentSchema, type AssignmentInput } from "@/lib/validation/operations";
import { formatDate } from "@/lib/utils";

/**
 * Assignment of a guide + vehicle (+ scheduled date) to a CONFIRMED booking
 * (Operations, Phase 6 — CLAUDE.md §9). One assignment per lead (leadId is
 * unique); "removing" one soft-archives the row (archive-not-delete, Addendum
 * §6). Every change is an ASSIGNMENT_CHANGE audit entry (§13). The target lead
 * comes from the route, never the payload (§11).
 */

const LIST = "/en/dashboard/assignments";

export async function upsertAssignment(leadId: string, input: AssignmentInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();

    const existing = await prisma.assignment.findUnique({
      where: { leadId },
      select: { id: true, archivedAt: true },
    });
    const isNew = !existing || existing.archivedAt !== null;
    requirePermission(actor, "assignments", isNew ? "create" : "edit");

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true, archivedAt: true, fullName: true },
    });
    if (!lead || lead.archivedAt) return { ok: false, error: "Booking not found." };
    if (lead.status !== "CONFIRMED")
      return { ok: false, error: "Only confirmed bookings can be scheduled." };

    const parsed = assignmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    let scheduledDate: Date | null = null;
    if (data.scheduledDate) {
      const d = new Date(data.scheduledDate);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "Enter a valid scheduled date." };
      scheduledDate = d;
    }

    if (!data.guideId && !data.vehicleId && !scheduledDate) {
      return { ok: false, error: "Add a guide, vehicle, or scheduled date." };
    }

    // Anti-tamper: ids must resolve to real records (the selects only offer valid ones).
    let guideName: string | null = null;
    if (data.guideId) {
      const guide = await prisma.guide.findUnique({ where: { id: data.guideId }, select: { name: true } });
      if (!guide) return { ok: false, error: "Selected guide not found." };
      guideName = guide.name;
    }
    let vehicleName: string | null = null;
    if (data.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId }, select: { name: true } });
      if (!vehicle) return { ok: false, error: "Selected vehicle not found." };
      vehicleName = vehicle.name;
    }

    const assignment = await prisma.assignment.upsert({
      where: { leadId },
      create: { leadId, guideId: data.guideId, vehicleId: data.vehicleId, scheduledDate },
      update: { guideId: data.guideId, vehicleId: data.vehicleId, scheduledDate, archivedAt: null },
    });

    const parts = [
      guideName ? `guide ${guideName}` : null,
      vehicleName ? `vehicle ${vehicleName}` : null,
      scheduledDate ? `on ${formatDate(scheduledDate)}` : null,
    ].filter(Boolean);
    await logAudit({
      actorId: actor.id,
      actionType: "ASSIGNMENT_CHANGE",
      resourceType: "Assignment",
      resourceId: assignment.id,
      metadata: {
        summary: `Booking for “${lead.fullName}” scheduled — ${parts.join(", ")}`,
        leadId,
      },
    });
    revalidatePath(LIST);
    revalidatePath(`${LIST}/${leadId}`);
    return { ok: true, id: assignment.id };
  } catch (err) {
    return fail("assignments", err);
  }
}

export async function clearAssignment(leadId: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "assignments", "delete");

    const assignment = await prisma.assignment.findUnique({
      where: { leadId },
      select: { id: true, archivedAt: true, lead: { select: { fullName: true } } },
    });
    if (!assignment || assignment.archivedAt) return { ok: true };

    await prisma.assignment.update({ where: { leadId }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "ASSIGNMENT_CHANGE",
      resourceType: "Assignment",
      resourceId: assignment.id,
      metadata: {
        summary: `Assignment removed for “${assignment.lead.fullName}”`,
        leadId,
      },
    });
    revalidatePath(LIST);
    revalidatePath(`${LIST}/${leadId}`);
    return { ok: true };
  } catch (err) {
    return fail("assignments", err);
  }
}
