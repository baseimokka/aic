"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { guideSchema, type GuideInput } from "@/lib/validation/operations";

/**
 * Guide CRUD (Operations, Phase 6 — CLAUDE.md §9). Operations Admin (and Super
 * Admin) manage the guide roster; every mutation is guarded server-side and
 * audited. Guides never surface on the public site, so only the admin list is
 * revalidated — no need to rebuild the localized public subtree.
 */

const LIST = "/en/dashboard/guides";

export async function createGuide(input: GuideInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "guides", "create");
    const parsed = guideSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const guide = await prisma.guide.create({
      data: {
        name: data.name,
        languages: data.languages,
        contact: data.contact,
        availabilityStatus: data.availabilityStatus,
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Guide",
      resourceId: guide.id,
      metadata: { summary: `Guide “${data.name}” added` },
    });
    revalidatePath(LIST);
    return { ok: true, id: guide.id };
  } catch (err) {
    return fail("guides", err);
  }
}

export async function updateGuide(id: string, input: GuideInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "guides", "edit");
    const parsed = guideSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const existing = await prisma.guide.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "Guide not found." };

    await prisma.guide.update({
      where: { id },
      data: {
        name: data.name,
        languages: data.languages,
        contact: data.contact,
        availabilityStatus: data.availabilityStatus,
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Guide",
      resourceId: id,
      metadata: { summary: `Guide “${data.name}” updated` },
    });
    revalidatePath(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("guides", err);
  }
}

export async function archiveGuide(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "guides", "delete");
    const guide = await prisma.guide.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!guide) return { ok: false, error: "Guide not found." };
    if (guide.archivedAt) return { ok: true };

    await prisma.guide.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "Guide",
      resourceId: id,
      metadata: { summary: `Guide “${guide.name}” archived` },
    });
    revalidatePath(LIST);
    return { ok: true };
  } catch (err) {
    return fail("guides", err);
  }
}

export async function restoreGuide(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "guides", "delete");
    const guide = await prisma.guide.findUnique({ where: { id }, select: { name: true, archivedAt: true } });
    if (!guide) return { ok: false, error: "Guide not found." };
    if (!guide.archivedAt) return { ok: true };

    await prisma.guide.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Guide",
      resourceId: id,
      metadata: { summary: `Guide “${guide.name}” restored` },
    });
    revalidatePath(LIST);
    return { ok: true };
  } catch (err) {
    return fail("guides", err);
  }
}
