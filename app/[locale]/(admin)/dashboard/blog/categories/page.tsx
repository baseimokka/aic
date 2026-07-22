import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { IconBack } from "@/components/admin/icons";
import { archiveBlogCategory, restoreBlogCategory } from "./actions";

export default async function BlogCategoriesPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "blog", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "blog", "edit");
  const canArchive = can(actor.role, "blog", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.blogCategory.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.blogCategory.count({ where: { archivedAt: null } }),
    prisma.blogCategory.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div>
      <Link href="/en/dashboard/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Blog
      </Link>
      <PageHeader
        title="Blog categories"
        description="Group articles for the blog index."
        action={can(actor.role, "blog", "create") ? <CreateLink href="/en/dashboard/blog/categories/new" label="New category" /> : undefined}
      />

      <div className="mb-4 flex gap-2">
        <FilterTab href="/en/dashboard/blog/categories" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/blog/categories?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[2fr_1.4fr_0.8fr_1.1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Name</span>
            <span>Slug</span>
            <span className="text-center">Posts</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}categories yet.</EmptyState>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="grid grid-cols-[2fr_1.4fr_0.8fr_1.1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                <span className="truncate text-sm font-bold text-ink">{c.name}</span>
                <span className="truncate font-mono text-[12px] text-muted">{c.slug}</span>
                <span className="text-center text-[13px] text-ink-soft">{c._count.posts}</span>
                <span className="flex items-center justify-end gap-2">
                  {canEdit ? (
                    <Link
                      href={`/en/dashboard/blog/categories/${c.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      Edit
                    </Link>
                  ) : null}
                  {canArchive ? (
                    <ArchiveDialog
                      id={c.id}
                      archived={Boolean(c.archivedAt)}
                      name={c.name}
                      entityLabel="category"
                      archiveAction={archiveBlogCategory}
                      restoreAction={restoreBlogCategory}
                      size="compact"
                    />
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
