import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDate } from "@/lib/utils";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { archiveBlogPost, restoreBlogPost } from "./actions";

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "blog", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "blog", "edit");
  const canArchive = can(actor.role, "blog", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.blogPost.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: {
        category: { select: { name: true } },
        translations: { where: { locale: "en" }, select: { title: true } },
      },
    }),
    prisma.blogPost.count({ where: { archivedAt: null } }),
    prisma.blogPost.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Articles (English only). Manage post categories separately."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/en/dashboard/blog/categories"
              className="inline-flex h-11 items-center rounded-[10px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink hover:bg-cream"
            >
              Categories
            </Link>
            {can(actor.role, "blog", "create") ? <CreateLink href="/en/dashboard/blog/new" label="New post" /> : null}
          </div>
        }
      />

      <div className="mb-4 flex gap-2">
        <FilterTab href="/en/dashboard/blog" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/blog?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[2.4fr_1.1fr_1fr_1fr_1.1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Title</span>
            <span>Category</span>
            <span>Status</span>
            <span>Published</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}posts yet.</EmptyState>
          ) : (
            rows.map((post) => {
              const title = post.translations[0]?.title ?? post.slug;
              return (
                <div key={post.id} className="grid grid-cols-[2.4fr_1.1fr_1fr_1fr_1.1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{title}</span>
                    <span className="block truncate font-mono text-[11px] text-faint">{post.slug}</span>
                  </span>
                  <span className="truncate text-[13px] text-ink-soft">{post.category?.name ?? "—"}</span>
                  <span className="flex flex-wrap gap-1">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${post.published ? "bg-[#e4f3eb] text-[#0f6b43]" : "bg-surface-2 text-muted"}`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                    {post.featured ? <span className="inline-flex rounded-md bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-[#9a5a00]">Featured</span> : null}
                  </span>
                  <span className="text-[13px] text-ink-soft">{post.publishedAt ? formatDate(post.publishedAt) : "—"}</span>
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/blog/${post.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={post.id}
                        archived={Boolean(post.archivedAt)}
                        name={title}
                        entityLabel="post"
                        archiveAction={archiveBlogPost}
                        restoreAction={restoreBlogPost}
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
