"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail } from "@/lib/admin/action";
import { ROLE_LABELS } from "@/lib/rbac/labels";
import {
  userCreateSchema,
  userUpdateSchema,
  passwordResetSchema,
  type UserCreateInput,
  type UserUpdateInput,
  type PasswordResetInput,
} from "@/lib/validation/users";

/**
 * Staff user management (Phase 7 — Super Admin only, CLAUDE.md §4). Guards
 * against locking the organisation out: you can't archive your own account and
 * the last active Super Admin can neither be archived nor demoted. Passwords
 * are bcrypt-hashed; the plain value never leaves the action. Every mutation is
 * audited. Users don't surface publicly, so only the admin list is revalidated.
 */

const LIST = "/en/dashboard/users";

/** Active (non-archived) Super Admin count — the last one is protected. */
async function activeSuperAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", archivedAt: null } });
}

export async function createUser(input: UserCreateInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "users", "create");
    const parsed = userCreateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const clash = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (clash) return { ok: false, error: "A user with that email already exists." };

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email, role: data.role, passwordHash },
    });

    await logAudit({
      actorId: actor.id,
      actionType: "CREATE",
      resourceType: "User",
      resourceId: user.id,
      metadata: { summary: `User “${data.name}” created (${ROLE_LABELS[data.role]})` },
    });
    revalidatePath(LIST);
    return { ok: true, id: user.id };
  } catch (err) {
    return fail("users", err);
  }
}

export async function updateUser(id: string, input: UserUpdateInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "users", "edit");
    const parsed = userUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    const data = parsed.data;

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true, archivedAt: true } });
    if (!target) return { ok: false, error: "User not found." };

    // Never demote the last active Super Admin — it would orphan user management.
    if (target.role === "SUPER_ADMIN" && data.role !== "SUPER_ADMIN" && !target.archivedAt) {
      if ((await activeSuperAdmins()) <= 1) {
        return { ok: false, error: "You can't change the role of the last Super Admin." };
      }
    }

    await prisma.user.update({ where: { id }, data: { name: data.name, role: data.role } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "User",
      resourceId: id,
      metadata: { summary: `User “${data.name}” updated (${ROLE_LABELS[data.role]})` },
    });
    revalidatePath(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("users", err);
  }
}

export async function resetUserPassword(id: string, input: PasswordResetInput): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "users", "edit");
    const parsed = passwordResetSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

    const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
    if (!target) return { ok: false, error: "User not found." };

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "User",
      resourceId: id,
      metadata: { summary: `Password reset for “${target.name ?? target.email}”` },
    });
    revalidatePath(LIST);
    return { ok: true, id };
  } catch (err) {
    return fail("users", err);
  }
}

export async function archiveUser(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "users", "delete");
    if (actor.id === id) return { ok: false, error: "You can't archive your own account." };

    const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true, role: true, archivedAt: true } });
    if (!target) return { ok: false, error: "User not found." };
    if (target.archivedAt) return { ok: true };
    if (target.role === "SUPER_ADMIN" && (await activeSuperAdmins()) <= 1) {
      return { ok: false, error: "You can't archive the last Super Admin." };
    }

    await prisma.user.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "User",
      resourceId: id,
      metadata: { summary: `User “${target.name ?? target.email}” archived` },
    });
    revalidatePath(LIST);
    return { ok: true };
  } catch (err) {
    return fail("users", err);
  }
}

export async function restoreUser(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "users", "delete");
    const target = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true, archivedAt: true } });
    if (!target) return { ok: false, error: "User not found." };
    if (!target.archivedAt) return { ok: true };

    await prisma.user.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "User",
      resourceId: id,
      metadata: { summary: `User “${target.name ?? target.email}” restored` },
    });
    revalidatePath(LIST);
    return { ok: true };
  } catch (err) {
    return fail("users", err);
  }
}
