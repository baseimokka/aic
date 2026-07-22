import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { BlogCategoryForm } from "@/components/admin/blog-category-form";
import { archiveBlogCategory, restoreBlogCategory } from "../actions";

export default async function EditBlogCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "blog", "view")) return <NoAccess />;

  const { id } = await params;
  const category = await prisma.blogCategory.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <div>
      <Link href="/en/dashboard/blog/categories" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Blog categories
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{category.name}</h2>
        {can(actor.role, "blog", "delete") ? (
          <ArchiveDialog
            id={category.id}
            archived={Boolean(category.archivedAt)}
            name={category.name}
            entityLabel="category"
            archiveAction={archiveBlogCategory}
            restoreAction={restoreBlogCategory}
            redirectTo="/en/dashboard/blog/categories"
          />
        ) : null}
      </div>
      <BlogCategoryForm mode="edit" id={category.id} initial={{ name: category.name, slug: category.slug }} />
    </div>
  );
}
