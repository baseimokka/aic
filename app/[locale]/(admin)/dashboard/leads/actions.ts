"use server";

import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission, AuthRequiredError, PermissionError } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { notifyUsers, idsByRole } from "@/lib/notifications/notify";
import { leadReference } from "@/lib/leads/reference";
import { LEAD_STATUS_LABELS, PAYMENT_STATUS_LABELS, leadSourceLabel } from "@/lib/leads/labels";
import {
  leadStatusSchema,
  leadFinancialsSchema,
  leadNoteSchema,
  leadCommunicationSchema,
  manualLeadSchema,
  type LeadFinancialsInput,
  type ManualLeadInput,
} from "@/lib/validation/lead";

/**
 * Every CRM mutation follows the same spine (§4, §11, §13): resolve the actor
 * from the session → requirePermission → Zod-validate → write → ONE audit row
 * → best-effort notifications → revalidate. UI gating is never the boundary.
 * `id` is returned on create so the UI can redirect to the new record.
 */
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function fail(err: unknown): ActionResult {
  if (err instanceof PermissionError || err instanceof AuthRequiredError) {
    return { ok: false, error: err.message };
  }
  console.error("[leads] action failed:", err);
  return { ok: false, error: "Something went wrong — please try again." };
}

function revalidateLead(leadId: string) {
  revalidatePath("/en/dashboard");
  revalidatePath("/en/dashboard/leads");
  revalidatePath(`/en/dashboard/leads/${leadId}`);
}

const leadUrl = (id: string) => `/en/dashboard/leads/${id}`;

/**
 * Manual lead entry (Sales): customers who reach out by email / WhatsApp /
 * phone / walk-in get a Lead identical to a website submission — same model,
 * same pipeline, same workflows — except `source` records the channel. The
 * creating salesperson becomes the assignee (they took the enquiry), and an
 * optional first note lands in the existing notes system.
 */
export async function createManualLead(input: ManualLeadInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "leads", "create");
    const parsed = manualLeadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    // Resolve the tour server-side; an archived tour can't take new interest.
    let tour: { id: string; currency: string } | null = null;
    if (data.tourId) {
      tour = await prisma.tour.findFirst({
        where: { id: data.tourId, archivedAt: null },
        select: { id: true, currency: true },
      });
      if (!tour) return { ok: false, error: "That tour is not available." };
    }

    const preferredDate = data.preferredDate ? new Date(`${data.preferredDate}T00:00:00Z`) : null;

    const lead = await prisma.lead.create({
      data: {
        tourId: tour?.id ?? null,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        country: data.country,
        preferredDate,
        adults: data.adults,
        children: data.children,
        source: data.source,
        currency: tour?.currency ?? undefined,
        // The salesperson who recorded the enquiry follows it up.
        assignedStaffId: actor.id,
      },
    });

    if (data.notes) {
      await prisma.leadNote.create({
        data: { leadId: lead.id, authorId: actor.id, body: data.notes },
      });
    }

    const reference = leadReference(lead.id, lead.createdAt);
    // One audit row — the note travels inside the create (§13: one row per mutation).
    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Lead",
      resourceId: lead.id,
      metadata: {
        source: data.source,
        summary: `Lead ${reference} entered manually — ${leadSourceLabel(data.source)}`,
      },
    });
    revalidateLead(lead.id);
    return { ok: true, id: lead.id };
  } catch (err) {
    return fail(err);
  }
}

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "leads", "edit");
    const next = leadStatusSchema.parse(status);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true, assignedStaffId: true, fullName: true, createdAt: true },
    });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (lead.status === next) return { ok: true };

    await prisma.lead.update({ where: { id: leadId }, data: { status: next } });

    const reference = leadReference(leadId, lead.createdAt);
    await logAudit({
      actorId: actor.id,
      actionType: "STATUS_CHANGE",
      resourceType: "Lead",
      resourceId: leadId,
      metadata: {
        from: lead.status,
        to: next,
        summary: `Lead ${reference} → ${LEAD_STATUS_LABELS[next]}`,
      },
    });
    await notifyUsers({
      userIds: [lead.assignedStaffId],
      actorId: actor.id,
      event: "status_changed",
      title: `Lead ${reference} moved to ${LEAD_STATUS_LABELS[next]}`,
      body: `${lead.fullName} — status changed from ${LEAD_STATUS_LABELS[lead.status]}.`,
      linkUrl: leadUrl(leadId),
    });
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function assignLead(leadId: string, staffId: string | null): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "leads", "edit");

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { assignedStaffId: true, fullName: true, createdAt: true },
    });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (lead.assignedStaffId === staffId) return { ok: true };

    let staffName: string | null = null;
    if (staffId) {
      const staff = await prisma.user.findFirst({
        where: { id: staffId, archivedAt: null },
        select: { name: true, email: true },
      });
      if (!staff) return { ok: false, error: "That staff member is not available." };
      staffName = staff.name ?? staff.email;
    }

    await prisma.lead.update({ where: { id: leadId }, data: { assignedStaffId: staffId } });

    const reference = leadReference(leadId, lead.createdAt);
    await logAudit({
      actorId: actor.id,
      actionType: "ASSIGNMENT_CHANGE",
      resourceType: "Lead",
      resourceId: leadId,
      metadata: {
        assigneeId: staffId,
        summary: staffId ? `Lead ${reference} assigned to ${staffName}` : `Lead ${reference} unassigned`,
      },
    });
    await notifyUsers({
      userIds: [staffId],
      actorId: actor.id,
      event: "reassigned",
      title: `Lead ${reference} was assigned to you`,
      body: `${lead.fullName} is now yours to follow up.`,
      linkUrl: leadUrl(leadId),
    });
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateLeadFinancials(
  leadId: string,
  input: LeadFinancialsInput,
): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "leads", "edit");
    const parsed = leadFinancialsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the payment status." };
    }
    const data = parsed.data;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { paymentStatus: true, assignedStaffId: true, fullName: true, createdAt: true },
    });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (lead.paymentStatus === data.paymentStatus) return { ok: true };

    // Prices derive from the chosen tour (per person × travelers) and are never
    // stored — the only editable financial field is the paid/unpaid marker.
    await prisma.lead.update({
      where: { id: leadId },
      data: { paymentStatus: data.paymentStatus },
    });

    const reference = leadReference(leadId, lead.createdAt);
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Lead",
      resourceId: leadId,
      metadata: {
        summary: `Payment marked ${PAYMENT_STATUS_LABELS[data.paymentStatus]} on lead ${reference}`,
        paymentStatus: data.paymentStatus,
      },
    });

    if (data.paymentStatus === "PAID_IN_FULL" && lead.paymentStatus !== "PAID_IN_FULL") {
      await notifyUsers({
        userIds: [lead.assignedStaffId, ...(await idsByRole("SUPER_ADMIN"))],
        actorId: actor.id,
        event: "paid_in_full",
        title: `Lead ${reference} marked Paid`,
        body: `${lead.fullName}'s trip price is settled.`,
        linkUrl: leadUrl(leadId),
      });
    }
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addLeadNote(leadId: string, formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  requirePermission(actor, "leads", "edit");
  const parsed = leadNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return; // empty note — nothing to save

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { assignedStaffId: true, fullName: true, createdAt: true },
  });
  if (!lead) return;

  const note = await prisma.leadNote.create({
    data: { leadId, authorId: actor.id, body: parsed.data.body },
  });

  const reference = leadReference(leadId, lead.createdAt);
  await logAudit({
    actorId: actor.id,
    actionType: "CREATE",
    resourceType: "LeadNote",
    resourceId: note.id,
    metadata: { leadId, summary: `Internal note added on lead ${reference}` },
  });
  // Watchers = the assignee + Super Admins, never the author (Addendum §6).
  await notifyUsers({
    userIds: [lead.assignedStaffId, ...(await idsByRole("SUPER_ADMIN"))],
    actorId: actor.id,
    event: "comment",
    title: `New note on lead ${reference}`,
    body: parsed.data.body.length > 140 ? `${parsed.data.body.slice(0, 140)}…` : parsed.data.body,
    linkUrl: leadUrl(leadId),
  });
  revalidateLead(leadId);
}

export async function addLeadCommunication(leadId: string, formData: FormData): Promise<void> {
  const actor = await getCurrentActor();
  requirePermission(actor, "leads", "edit");
  const parsed = leadCommunicationSchema.safeParse({
    channel: formData.get("channel"),
    summary: formData.get("summary"),
  });
  if (!parsed.success) return;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { createdAt: true },
  });
  if (!lead) return;

  const communication = await prisma.leadCommunication.create({
    data: { leadId, authorId: actor.id, channel: parsed.data.channel, summary: parsed.data.summary },
  });

  await logAudit({
    actorId: actor.id,
    actionType: "CREATE",
    resourceType: "LeadCommunication",
    resourceId: communication.id,
    metadata: {
      leadId,
      summary: `${parsed.data.channel} contact logged on lead ${leadReference(leadId, lead.createdAt)}`,
    },
  });
  revalidateLead(leadId);
}

/** "Delete" is archive everywhere — restorable, nothing is removed (Addendum §6). */
export async function archiveLead(leadId: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "leads", "delete");

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { createdAt: true, archivedAt: true } });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (lead.archivedAt) return { ok: true };

    await prisma.lead.update({ where: { id: leadId }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "Lead",
      resourceId: leadId,
      metadata: { summary: `Lead ${leadReference(leadId, lead.createdAt)} archived` },
    });
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function restoreLead(leadId: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "leads", "delete");

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { createdAt: true, archivedAt: true } });
    if (!lead) return { ok: false, error: "Lead not found." };
    if (!lead.archivedAt) return { ok: true };

    await prisma.lead.update({ where: { id: leadId }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Lead",
      resourceId: leadId,
      metadata: { summary: `Lead ${leadReference(leadId, lead.createdAt)} restored from archive` },
    });
    revalidateLead(leadId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
