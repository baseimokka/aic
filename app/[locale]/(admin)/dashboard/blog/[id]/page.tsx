import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { BlogPostForm } from "@/components/admin/blog-post-form";
import { archiveBlogPost, restoreBlogPost } from "../actions";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "blog", "view")) return <NoAccess />;

  const { id } = await params;
  const [post, categories] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: {
        translations: {
          where: { locale: "en" },
          select: { title: true, excerpt: true, body: true, seoTitle: true, metaDescription: true },
        },
      },
    }),
    prisma.blogCategory.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!post) notFound();

  const en = post.translations[0];
  const title = en?.title ?? post.slug;

  return (
    <div>
      <Link href="/en/dashboard/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Blog
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink line-clamp-1">{title}</h2>
        {can(actor.role, "blog", "delete") ? (
          <ArchiveDialog
            id={post.id}
            archived={Boolean(post.archivedAt)}
            name={title}
            entityLabel="post"
            archiveAction={archiveBlogPost}
            restoreAction={restoreBlogPost}
            redirectTo="/en/dashboard/blog"
          />
        ) : null}
      </div>
      <BlogPostForm
        mode="edit"
        id={post.id}
        categories={categories}
        initial={{
          title: en?.title ?? "",
          slug: post.slug,
          categoryId: post.categoryId ?? "",
          excerpt: en?.excerpt ?? "",
          body: en?.body ?? "",
          coverImagePath: post.coverImagePath,
          featured: post.featured,
          published: post.published,
          seoTitle: en?.seoTitle ?? "",
          metaDescription: en?.metaDescription ?? "",
        }}
      />
    </div>
  );
}
