import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { CategoryForm } from "@/components/admin/category-form";
import { archiveCategory, restoreCategory } from "../actions";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "categories", "view")) return <NoAccess />;

  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { translations: { where: { locale: "en" }, select: { name: true, description: true } } },
  });
  if (!category) notFound();

  const en = category.translations[0];
  const name = en?.name ?? category.slug;

  return (
    <div>
      <Link href="/en/dashboard/categories" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Categories
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{name}</h2>
        {can(actor.role, "categories", "delete") ? (
          <ArchiveDialog
            id={category.id}
            archived={Boolean(category.archivedAt)}
            name={name}
            entityLabel="category"
            archiveAction={archiveCategory}
            restoreAction={restoreCategory}
            redirectTo="/en/dashboard/categories"
          />
        ) : null}
      </div>
      <CategoryForm
        mode="edit"
        id={category.id}
        initial={{ name: en?.name ?? "", slug: category.slug, description: en?.description ?? "", order: category.order }}
      />

      <div className="mt-8">
        <TranslationsSection entityType="category" entityId={category.id} />
      </div>
    </div>
  );
}
