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
import { archiveHeroBanner, restoreHeroBanner } from "./actions";

export default async function HeroBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "heroBanners", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "heroBanners", "edit");
  const canArchive = can(actor.role, "heroBanners", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.heroBanner.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { order: "asc" },
      include: { translations: { where: { locale: "en" }, select: { headline: true } } },
    }),
    prisma.heroBanner.count({ where: { archivedAt: null } }),
    prisma.heroBanner.count({ where: { archivedAt: { not: null } } }),
  ]);

  const trLocales = await loadListLocales("heroBanner", rows.map((r) => r.id));

  return (
    <div>
      <PageHeader
        title="Hero banners"
        description="Full-width slides at the top of the homepage — schedulable and orderable."
        action={can(actor.role, "heroBanners", "create") ? <CreateLink href="/en/dashboard/hero-banners/new" label="New banner" /> : undefined}
      />

      <div className="mb-4 flex gap-2">
        <FilterTab href="/en/dashboard/hero-banners" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/hero-banners?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[96px_2.4fr_0.8fr_0.8fr_0.8fr_1.5fr_1.1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span></span>
            <span>Headline</span>
            <span className="text-center">Enabled</span>
            <span className="text-center">Search</span>
            <span className="text-center">Order</span>
            <span>Languages</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}hero banners yet.</EmptyState>
          ) : (
            rows.map((b) => {
              const headline = b.translations[0]?.headline ?? "(untitled)";
              return (
                <div key={b.id} className="grid grid-cols-[96px_2.4fr_0.8fr_0.8fr_0.8fr_1.5fr_1.1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                  <MediaImage path={b.imagePath} alt="" rounded className="h-12 w-24" sizes="96px" />
                  <span className="truncate text-sm font-bold text-ink">{headline}</span>
                  <span className="text-center text-[13px] text-ink-soft">{b.enabled ? "Yes" : "No"}</span>
                  <span className="text-center text-[13px] text-ink-soft">{b.showSearch ? "Yes" : "No"}</span>
                  <span className="text-center text-[13px] text-ink-soft">{b.order}</span>
                  <TranslationColumn locales={trLocales.get(b.id) ?? new Set<string>()} href={`/en/dashboard/hero-banners/${b.id}`} />
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/hero-banners/${b.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={b.id}
                        archived={Boolean(b.archivedAt)}
                        name={headline}
                        entityLabel="banner"
                        archiveAction={archiveHeroBanner}
                        restoreAction={restoreHeroBanner}
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
