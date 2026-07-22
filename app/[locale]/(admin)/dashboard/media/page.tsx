import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { MEDIA_FOLDERS, isMediaFolder } from "@/lib/storage/folders";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, EmptyState } from "@/components/admin/page-header";
import { FilterTab } from "@/components/admin/filter-tab";
import { MediaUploader } from "@/components/admin/media-uploader";
import { MediaCard } from "@/components/admin/media-card";
import { controlClass } from "@/components/admin/form";

/** How many assets one page of the library shows; "Load more" widens the window. */
const PAGE_SIZE = 48;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string; q?: string; limit?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "media", "view")) return <NoAccess />;
  const canCreate = can(actor.role, "media", "create");
  const canEdit = can(actor.role, "media", "edit");
  const canArchive = can(actor.role, "media", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";
  const type = sp.type && isMediaFolder(sp.type) ? sp.type : undefined;
  const q = sp.q?.trim() ?? "";
  const limit = Math.min(Math.max(Number(sp.limit) || PAGE_SIZE, PAGE_SIZE), 480);

  const where: Prisma.MediaWhereInput = {
    archivedAt: archived ? { not: null } : null,
    ...(type ? { type } : {}),
    ...(q
      ? {
          OR: [
            { alt: { contains: q, mode: "insensitive" } },
            { path: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  // One extra row tells us whether a further page exists, without a count query.
  const rows = await prisma.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });
  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  const buildHref = (over: { type?: string; archived?: boolean; q?: string; limit?: number }) => {
    const p = new URLSearchParams();
    const nextType = "type" in over ? over.type : type;
    const nextArchived = "archived" in over ? over.archived : archived;
    const nextQ = "q" in over ? over.q : q;
    if (nextType) p.set("type", nextType);
    if (nextArchived) p.set("archived", "1");
    if (nextQ) p.set("q", nextQ);
    if (over.limit) p.set("limit", String(over.limit));
    const qs = p.toString();
    return `/en/dashboard/media${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="Media library" description="Locally stored assets, reusable across every module. Alt text is required on every image (WCAG AA)." />

      {canCreate ? (
        <div className="mb-6">
          <MediaUploader />
        </div>
      ) : null}

      {/* Plain GET form — search works without client JS. */}
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {type ? <input type="hidden" name="type" value={type} /> : null}
        {archived ? <input type="hidden" name="archived" value="1" /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search alt text or file name"
          aria-label="Search media"
          className={`${controlClass} h-11 max-w-xs`}
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
        >
          Search
        </button>
        {q ? (
          <Link
            href={buildHref({ q: "" })}
            className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink-soft hover:bg-cream"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterTab href={buildHref({ type: undefined, archived: false })} active={!type && !archived} label="All" />
        {MEDIA_FOLDERS.map((f) => (
          <FilterTab key={f} href={buildHref({ type: f, archived: false })} active={type === f && !archived} label={f} />
        ))}
        <FilterTab href={buildHref({ archived: true })} active={archived} label="Archived" />
      </div>

      {page.length === 0 ? (
        <div className="rounded-xl border border-line bg-white shadow-card">
          <EmptyState>
            No {archived ? "archived " : ""}media{type ? ` in “${type}”` : ""}
            {q ? ` matching “${q}”` : ""}.{" "}
            {type || archived || q ? <Link href="/en/dashboard/media" className="font-bold text-accent">Clear filters</Link> : null}
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {page.map((m) => (
              <MediaCard
                key={m.id}
                item={{
                  id: m.id,
                  path: m.path,
                  thumbPath: m.thumbPath,
                  alt: m.alt,
                  type: m.type,
                  archived: Boolean(m.archivedAt),
                  width: m.width,
                  height: m.height,
                  bytes: m.bytes,
                  createdAt: m.createdAt.toISOString(),
                }}
                canEdit={canEdit}
                canArchive={canArchive}
              />
            ))}
          </div>

          {hasMore ? (
            <div className="mt-5 text-center">
              <Link
                href={buildHref({ limit: limit + PAGE_SIZE })}
                className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-5 text-[13px] font-bold text-ink hover:bg-cream"
              >
                Load more
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
