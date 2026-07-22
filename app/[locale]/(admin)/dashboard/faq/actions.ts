"use server";

import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { revalidateContent } from "@/lib/admin/revalidate";
import { faqSchema, type FaqInput } from "@/lib/validation/content";

/**
 * Global FAQ CRUD (§4/§13) — these are site-wide entries (tourId = null) that
 * feed the public /faq page. Per-tour FAQs are managed inside the tour editor.
 * The English question/answer is the source translation row.
 */

const LIST = "/en/dashboard/faq";

export async function createFaq(input: FaqInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "faqs", "create");
    const parsed = faqSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const f = parsed.data;

    const faq = await prisma.faq.create({
      data: {
        tourId: null,
        order: f.order,
        translations: { create: { locale: "en", question: f.question, answer: f.answer } },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "Faq",
      resourceId: faq.id,
      metadata: { summary: `FAQ “${f.question}” created` },
    });
    revalidateContent(LIST);
    return { ok: true, id: faq.id };
  } catch (err) {
    return fail("faq", err);
  }
}

export async function updateFaq(id: string, input: FaqInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "faqs", "edit");
    const parsed = faqSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const f = parsed.data;

    const existing = await prisma.faq.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, error: "FAQ not found." };

    await prisma.faq.update({
      where: { id },
      data: {
        order: f.order,
        translations: {
          upsert: {
            where: { faqId_locale: { faqId: id, locale: "en" } },
            create: { locale: "en", question: f.question, answer: f.answer },
            update: { question: f.question, answer: f.answer },
          },
        },
      },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Faq",
      resourceId: id,
      metadata: { summary: `FAQ “${f.question}” updated` },
    });
    revalidateContent(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("faq", err);
  }
}

async function setArchived(id: string, archive: boolean): Promise<ActionResult> {
  const actor = await getCurrentActor();
  requirePermission(actor, "faqs", "delete");
  const faq = await prisma.faq.findUnique({
    where: { id },
    select: { archivedAt: true, translations: { where: { locale: "en" }, select: { question: true } } },
  });
  if (!faq) return { ok: false, error: "FAQ not found." };
  if (archive === Boolean(faq.archivedAt)) return { ok: true };

  await prisma.faq.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  await logAudit({
    actorId: actor.id,
    actionType: archive ? "DELETE" : "UPDATE",
    resourceType: "Faq",
    resourceId: id,
    metadata: { summary: `FAQ “${faq.translations[0]?.question ?? id}” ${archive ? "archived" : "restored"}` },
  });
  revalidateContent(LIST);
  return { ok: true };
}

export async function archiveFaq(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, true);
  } catch (err) {
    return fail("faq", err);
  }
}

export async function restoreFaq(id: string): Promise<ActionResult> {
  try {
    return await setArchived(id, false);
  } catch (err) {
    return fail("faq", err);
  }
}
