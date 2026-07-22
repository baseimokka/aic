import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { BlogPostForm } from "@/components/admin/blog-post-form";

export default async function NewBlogPostPage() {
  const actor = await requireActor();
  if (!can(actor.role, "blog", "create")) return <NoAccess />;

  const categories = await prisma.blogCategory.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <Link href="/en/dashboard/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Blog
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New post</h2>
      <BlogPostForm
        mode="create"
        categories={categories}
        initial={{
          title: "",
          slug: "",
          categoryId: "",
          excerpt: "",
          body: "",
          coverImagePath: null,
          featured: false,
          published: false,
          seoTitle: "",
          metaDescription: "",
        }}
      />
    </div>
  );
}
