import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { BlogCategoryForm } from "@/components/admin/blog-category-form";

export default async function NewBlogCategoryPage() {
  const actor = await requireActor();
  if (!can(actor.role, "blog", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/blog/categories" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Blog categories
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New blog category</h2>
      <BlogCategoryForm mode="create" initial={{ name: "", slug: "" }} />
    </div>
  );
}
