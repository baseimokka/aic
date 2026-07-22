"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission, AuthRequiredError, PermissionError } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import {
  assignmentRuleSchema,
  settingsSchema,
  type AssignmentRuleInput,
  type SettingsInput,
} from "@/lib/validation/settings";
import { currencySchema } from "@/lib/validation/lead";
import { DEFAULT_CURRENCIES } from "@/lib/admin/currencies";
import type { ActionResult } from "../leads/actions";

function fail(err: unknown): ActionResult {
  if (err instanceof PermissionError || err instanceof AuthRequiredError) {
    return { ok: false, error: err.message };
  }
  console.error("[settings] action failed:", err);
  return { ok: false, error: "Something went wrong — please try again." };
}

function revalidateSettings() {
  revalidatePath("/en/dashboard/settings");
}

export async function updateSettings(input: SettingsInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "settings", "edit");
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    if (data.fallbackAssigneeId) {
      const staff = await prisma.user.findFirst({
        where: { id: data.fallbackAssigneeId, archivedAt: null },
        select: { id: true },
      });
      if (!staff) return { ok: false, error: "That fallback assignee is not available." };
    }

    const existing = await prisma.settings.findFirst({ select: { id: true } });
    const values = {
      defaultCurrency: data.defaultCurrency,
      currencies: data.currencies,
      allowPerLeadCurrencyOverride: data.allowPerLeadCurrencyOverride,
      fallbackAssigneeId: data.fallbackAssigneeId,
    };
    const row = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data: values })
      : await prisma.settings.create({ data: values });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Settings",
      resourceId: row.id,
      metadata: { summary: "Global settings updated" },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Currency list mutations persist immediately (like assignment rules) — an
 * added currency must survive navigating away, not sit staged behind a
 * separate "Save changes" click.
 */
export async function addCurrency(code: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "settings", "edit");
    const parsed = currencySchema.safeParse(code);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the code." };
    const value = parsed.data;

    const existing = await prisma.settings.findFirst({ select: { id: true, currencies: true } });
    const current = existing?.currencies?.length ? existing.currencies : [...DEFAULT_CURRENCIES];
    if (current.includes(value)) return { ok: false, error: `${value} is already in the list.` };

    const next = [...current, value];
    const row = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data: { currencies: next } })
      : await prisma.settings.create({ data: { currencies: next } });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Settings",
      resourceId: row.id,
      metadata: { summary: `Currency ${value} added` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function removeCurrency(code: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "settings", "edit");
    const parsed = currencySchema.safeParse(code);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the code." };
    const value = parsed.data;

    const existing = await prisma.settings.findFirst({
      select: { id: true, currencies: true, defaultCurrency: true },
    });
    const current = existing?.currencies?.length ? existing.currencies : [...DEFAULT_CURRENCIES];
    if (!current.includes(value)) return { ok: true };
    if ((existing?.defaultCurrency ?? "USD") === value) {
      return { ok: false, error: "Pick a different default currency before removing this one." };
    }
    const next = current.filter((c) => c !== value);
    if (next.length === 0) return { ok: false, error: "Keep at least one currency." };

    const row = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data: { currencies: next } })
      : await prisma.settings.create({ data: { currencies: next } });

    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Settings",
      resourceId: row.id,
      metadata: { summary: `Currency ${value} removed` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createAssignmentRule(input: AssignmentRuleInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "assignmentRules", "create");
    const parsed = assignmentRuleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the rule." };

    const max = await prisma.assignmentRule.aggregate({ _max: { order: true } });
    const rule = await prisma.assignmentRule.create({
      data: { ...parsed.data, order: (max._max.order ?? 0) + 1 },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "AssignmentRule",
      resourceId: rule.id,
      metadata: { summary: `Assignment rule “${rule.name}” created` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateAssignmentRule(
  id: string,
  input: AssignmentRuleInput,
): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "assignmentRules", "edit");
    const parsed = assignmentRuleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the rule." };

    const rule = await prisma.assignmentRule.update({ where: { id }, data: parsed.data });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "AssignmentRule",
      resourceId: id,
      metadata: { summary: `Assignment rule “${rule.name}” updated` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleAssignmentRule(id: string, enabled: boolean): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "assignmentRules", "edit");
    const rule = await prisma.assignmentRule.update({ where: { id }, data: { enabled } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "AssignmentRule",
      resourceId: id,
      metadata: { summary: `Assignment rule “${rule.name}” ${enabled ? "enabled" : "disabled"}` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function moveAssignmentRule(id: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "assignmentRules", "edit");

    const rules = await prisma.assignmentRule.findMany({
      orderBy: { order: "asc" },
      select: { id: true, order: true, name: true },
    });
    const index = rules.findIndex((r) => r.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= rules.length) return { ok: true };

    await prisma.$transaction([
      prisma.assignmentRule.update({ where: { id: rules[index].id }, data: { order: rules[swapWith].order } }),
      prisma.assignmentRule.update({ where: { id: rules[swapWith].id }, data: { order: rules[index].order } }),
    ]);
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "AssignmentRule",
      resourceId: id,
      metadata: { summary: `Assignment rule “${rules[index].name}” moved ${direction}` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Rules are routing config, not content — removing one really deletes it. */
export async function deleteAssignmentRule(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "assignmentRules", "delete");
    const rule = await prisma.assignmentRule.delete({ where: { id } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "AssignmentRule",
      resourceId: id,
      metadata: { summary: `Assignment rule “${rule.name}” removed` },
    });
    revalidateSettings();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
