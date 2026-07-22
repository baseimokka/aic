import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { loadListLocales } from "@/lib/translation/db";
import { TranslationColumn } from "@/components/admin/translations/column";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { MediaImage } from "@/components/ui/media-image";
import { archiveDestination, restoreDestination } from "./actions";

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "destinations", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "destinations", "edit");
  const canArchive = can(actor.role, "destinations", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.destination.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { order: "asc" },
      include: {
        translations: { where: { locale: "en" }, select: { name: true } },
        _count: { select: { tours: true } },
      },
    }),
    prisma.destination.count({ where: { archivedAt: null } }),
    prisma.destination.count({ where: { archivedAt: { not: null } } }),
  ]);

  const trLocales = await loadListLocales("destination", rows.map((r) => r.id));

  return (
    <div>
      <PageHeader
        title="Destinations"
        description="Places tours belong to — each has its own landing page and SEO."
        action={can(actor.role, "destinations", "create") ? <CreateLink href="/en/dashboard/destinations/new" label="New destination" /> : undefined}
      />

      <div className="mb-4 flex gap-2">
        <FilterTab href="/en/dashboard/destinations" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/destinations?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-[64px_2fr_1.2fr_0.8fr_0.9fr_1.5fr_1.2fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span></span>
            <span>Name</span>
            <span>Slug</span>
            <span className="text-center">Tours</span>
            <span className="text-center">Featured</span>
            <span>Languages</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}destinations yet.</EmptyState>
          ) : (
            rows.map((d) => {
              const name = d.translations[0]?.name ?? d.slug;
              return (
                <div
                  key={d.id}
                  className="grid grid-cols-[64px_2fr_1.2fr_0.8fr_0.9fr_1.5fr_1.2fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <MediaImage path={d.heroImagePath} alt="" rounded className="h-11 w-16" sizes="64px" />
                  <span className="truncate text-sm font-bold text-ink">{name}</span>
                  <span className="truncate font-mono text-[12px] text-muted">{d.slug}</span>
                  <span className="text-center text-[13px] text-ink-soft">{d._count.tours}</span>
                  <span className="text-center text-[13px] text-ink-soft">{d.featured ? "★" : "—"}</span>
                  <TranslationColumn locales={trLocales.get(d.id) ?? new Set<string>()} href={`/en/dashboard/destinations/${d.id}`} />
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/destinations/${d.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={d.id}
                        archived={Boolean(d.archivedAt)}
                        name={name}
                        entityLabel="destination"
                        archiveAction={archiveDestination}
                        restoreAction={restoreDestination}
                        size="compact"
                      />
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
