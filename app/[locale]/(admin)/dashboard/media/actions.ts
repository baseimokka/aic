"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission } from "@/lib/rbac/guard";
import { logAudit } from "@/lib/audit/log";
import { type ActionResult, fail, failError } from "@/lib/admin/action";
import { registerMediaSchema, mediaAltSchema, type RegisterMediaInput } from "@/lib/validation/media";
import type { MediaItem } from "@/lib/storage/media-item";

/**
 * Media Library mutations (§ Media Storage). Every admin write follows the P3
 * spine: actor → requirePermission → Zod → write → one audit row → revalidate.
 * Only the stored file path (+ alt/type/dims) is recorded — never binary.
 */

function revalidateMedia() {
  revalidatePath("/en/dashboard/media");
}

/** `registerMedia` hands the stored asset straight back so a picker can show it. */
export type RegisterMediaResult = { ok: true; item: MediaItem } | { ok: false; error: string };

/**
 * Record an asset after a successful upload through the StorageService.
 * Idempotent: re-registering an existing path refreshes its metadata rather
 * than erroring, since the path is unique.
 */
export async function registerMedia(input: RegisterMediaInput): Promise<RegisterMediaResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "media", "create");
    const parsed = registerMediaSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the media details." };
    }
    const data = parsed.data;

    const existing = await prisma.media.findUnique({ where: { path: data.path }, select: { id: true } });
    const media = await prisma.media.upsert({
      where: { path: data.path },
      create: {
        path: data.path,
        thumbPath: data.thumbPath ?? null,
        type: data.type,
        alt: data.alt,
        width: data.width ?? null,
        height: data.height ?? null,
        bytes: data.bytes ?? null,
        format: data.format ?? null,
      },
      update: { alt: data.alt, type: data.type, archivedAt: null },
    });

    await logAudit({
      actorId: actor.id,
      actionType: existing ? "UPDATE" : "CREATE",
      resourceType: "Media",
      resourceId: media.id,
      metadata: { summary: `${existing ? "Updated" : "Uploaded"} media ${data.path}` },
    });
    revalidateMedia();
    return {
      ok: true,
      item: {
        id: media.id,
        path: media.path,
        thumbPath: media.thumbPath,
        type: media.type,
        alt: media.alt,
        width: media.width,
        height: media.height,
        bytes: media.bytes,
        format: media.format,
        createdAt: media.createdAt.toISOString(),
      },
    };
  } catch (err) {
    return failError("media", err);
  }
}

export async function updateMediaAlt(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "media", "edit");
    const parsed = mediaAltSchema.safeParse({ alt: formData.get("alt") });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Alt text is required." };
    }
    const media = await prisma.media.findUnique({ where: { id }, select: { path: true } });
    if (!media) return { ok: false, error: "Asset not found." };

    await prisma.media.update({ where: { id }, data: { alt: parsed.data.alt } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Media",
      resourceId: id,
      metadata: { summary: `Alt text updated on media ${media.path}` },
    });
    revalidateMedia();
    return { ok: true };
  } catch (err) {
    return fail("media", err);
  }
}

export async function archiveMedia(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "media", "delete");
    const media = await prisma.media.findUnique({ where: { id }, select: { path: true, archivedAt: true } });
    if (!media) return { ok: false, error: "Asset not found." };
    if (media.archivedAt) return { ok: true };

    await prisma.media.update({ where: { id }, data: { archivedAt: new Date() } });
    await logAudit({
      actorId: actor.id,
      actionType: "DELETE",
      resourceType: "Media",
      resourceId: id,
      metadata: { summary: `Media ${media.path} archived` },
    });
    revalidateMedia();
    return { ok: true };
  } catch (err) {
    return fail("media", err);
  }
}

export async function restoreMedia(id: string): Promise<ActionResult> {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "media", "delete");
    const media = await prisma.media.findUnique({ where: { id }, select: { path: true, archivedAt: true } });
    if (!media) return { ok: false, error: "Asset not found." };
    if (!media.archivedAt) return { ok: true };

    await prisma.media.update({ where: { id }, data: { archivedAt: null } });
    await logAudit({
      actorId: actor.id,
      actionType: "UPDATE",
      resourceType: "Media",
      resourceId: id,
      metadata: { summary: `Media ${media.path} restored from archive` },
    });
    revalidateMedia();
    return { ok: true };
  } catch (err) {
    return fail("media", err);
  }
}
