import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { CategoryForm } from "@/components/admin/category-form";

export default async function NewCategoryPage() {
  const actor = await requireActor();
  if (!can(actor.role, "categories", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/categories" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Categories
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New category</h2>
      <CategoryForm mode="create" initial={{ name: "", slug: "", description: "", order: 0 }} />
    </div>
  );
}
