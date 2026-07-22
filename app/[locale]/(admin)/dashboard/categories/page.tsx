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
import { archiveCategory, restoreCategory } from "./actions";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "categories", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "categories", "edit");
  const canArchive = can(actor.role, "categories", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.category.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { order: "asc" },
      include: {
        translations: { where: { locale: "en" }, select: { name: true } },
        _count: { select: { tours: true } },
      },
    }),
    prisma.category.count({ where: { archivedAt: null } }),
    prisma.category.count({ where: { archivedAt: { not: null } } }),
  ]);

  const trLocales = await loadListLocales("category", rows.map((r) => r.id));

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group tours into themes shown across the catalog and homepage."
        action={can(actor.role, "categories", "create") ? <CreateLink href="/en/dashboard/categories/new" label="New category" /> : undefined}
      />

      <div className="mb-4 flex gap-2 text-[13px]">
        <FilterTab href="/en/dashboard/categories" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/categories?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[2fr_1.4fr_0.8fr_0.8fr_1.5fr_1.2fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Name</span>
            <span>Slug</span>
            <span className="text-center">Tours</span>
            <span className="text-center">Order</span>
            <span>Languages</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}categories yet.</EmptyState>
          ) : (
            rows.map((c) => {
              const name = c.translations[0]?.name ?? c.slug;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[2fr_1.4fr_0.8fr_0.8fr_1.5fr_1.2fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <span className="truncate text-sm font-bold text-ink">{name}</span>
                  <span className="truncate font-mono text-[12px] text-muted">{c.slug}</span>
                  <span className="text-center text-[13px] text-ink-soft">{c._count.tours}</span>
                  <span className="text-center text-[13px] text-ink-soft">{c.order}</span>
                  <TranslationColumn locales={trLocales.get(c.id) ?? new Set<string>()} href={`/en/dashboard/categories/${c.id}`} />
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/categories/${c.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={c.id}
                        archived={Boolean(c.archivedAt)}
                        name={name}
                        entityLabel="category"
                        archiveAction={archiveCategory}
                        restoreAction={restoreCategory}
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
