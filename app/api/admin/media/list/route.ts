import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission, PermissionError, AuthRequiredError } from "@/lib/rbac/guard";
import { can } from "@/lib/rbac/matrix";
import { mediaListQuerySchema } from "@/lib/validation/media";
import type { MediaItem, MediaListResponse } from "@/lib/storage/media-item";

/**
 * Paginated media browser feed (§ Media Storage) — the read side of the Media
 * Picker. A read, not a mutation, so it stays an API route rather than a server
 * action: the picker pages through it with a cursor as the admin scrolls, and
 * never loads the whole library.
 *
 * RBAC mirrors the Media Library itself: `media:view` to browse, `media:create`
 * to upload. The `canUpload` flag is advisory for the UI — the upload route
 * enforces it independently.
 */

const SELECT = {
  id: true,
  path: true,
  thumbPath: true,
  type: true,
  alt: true,
  width: true,
  height: true,
  bytes: true,
  format: true,
  createdAt: true,
} satisfies Prisma.MediaSelect;

type Row = Prisma.MediaGetPayload<{ select: typeof SELECT }>;

function toItem(row: Row): MediaItem {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export async function GET(request: Request) {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "media", "view");

    const url = new URL(request.url);
    const parsed = mediaListQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      folder: url.searchParams.get("folder") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      paths: url.searchParams.getAll("path").length ? url.searchParams.getAll("path") : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid media query." }, { status: 400 });
    }
    const { q, folder, cursor, limit, paths } = parsed.data;
    const canUpload = can(actor.role, "media", "create");

    // Hydration lookup: resolve already-saved paths to their library records so
    // a field can show real metadata without paging the whole library.
    if (paths) {
      const rows = await prisma.media.findMany({ where: { path: { in: paths } }, select: SELECT });
      const body: MediaListResponse = { items: rows.map(toItem), nextCursor: null, canUpload };
      return NextResponse.json(body);
    }

    const where: Prisma.MediaWhereInput = {
      archivedAt: null, // archived assets are never offered for selection
      ...(folder ? { type: folder } : {}),
      ...(q
        ? {
            OR: [
              { alt: { contains: q, mode: "insensitive" } },
              { path: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Fetch one extra row to learn whether another page exists without a count.
    const rows = await prisma.media.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: SELECT,
    });

    const page = rows.slice(0, limit);
    const body: MediaListResponse = {
      items: page.map(toItem),
      nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
      canUpload,
    };
    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[media/list] failed:", err);
    return NextResponse.json({ error: "Could not load media." }, { status: 500 });
  }
}
