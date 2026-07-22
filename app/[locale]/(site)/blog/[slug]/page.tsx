import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getBlogPostBySlug, getBlogSlugs, getBlogList } from "@/lib/db/pages";
import { MediaImage } from "@/components/ui/media-image";

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ locale: "en", slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Article" };
  return {
    title: post.seoTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    alternates: { canonical: `/en/blog/${post.slug}` },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const related = (await getBlogList()).filter((p) => p.slug !== post.slug).slice(0, 2);
  const paragraphs = post.body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt ?? undefined,
    author: { "@type": "Organization", name: "AIC Travel" },
    publisher: { "@type": "Organization", name: "AIC Travel" },
  };

  return (
    <main className="px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto max-w-[720px]">
        <Link href="/en/blog" className="text-sm text-muted hover:text-ink">
          &larr; {t.blog.backToBlog}
        </Link>

        {post.category && <p className="mt-6 text-xs font-bold uppercase tracking-[0.1em] text-teal">{post.category}</p>}
        <h1 className="mt-3 text-balance font-serif text-[40px] font-semibold leading-[1.12] text-ink">{post.title}</h1>
        {post.publishedAt && (
          <p className="mt-3 text-[13px] text-faint">
            {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        )}

        <MediaImage path={post.coverImagePath} alt={post.title} className="mt-6 aspect-[16/9] w-full" />

        {paragraphs.map((p, i) =>
          i === 0 ? (
            <p key={i} className="mt-8 font-serif text-xl leading-[1.6] text-ink">
              {p}
            </p>
          ) : (
            <p key={i} className="mt-4 text-base leading-[1.75] text-ink-soft">
              {p}
            </p>
          ),
        )}
      </article>

      {related.length > 0 && (
        <section className="mx-auto mt-14 max-w-[760px] border-t border-line-soft pt-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">{t.detail.related}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.slug} href={`/en/blog/${r.slug}`} className="flex gap-3 overflow-hidden rounded-xl border border-line bg-white shadow-card">
                <MediaImage path={r.coverImagePath} alt={r.title} rounded={false} className="h-[90px] w-[90px] shrink-0" />
                <div className="py-3 pe-3">
                  {r.category && <span className="text-[10px] font-bold uppercase text-teal">{r.category}</span>}
                  <h3 className="mt-1 line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-ink">{r.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
