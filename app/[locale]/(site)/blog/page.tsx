import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getBlogList } from "@/lib/db/pages";
import { MediaImage } from "@/components/ui/media-image";
import { StaggerGroup } from "@/components/site/stagger-group";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).blog.title };
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const b = t.blog;

  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) || "";
  const posts = await getBlogList(q);

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{b.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{b.subtitle}</p>

      <form method="get" className="relative mt-6 max-w-md">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="#6E6A80"
          strokeWidth={2}
          className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={b.searchPlaceholder}
          aria-label={b.search}
          className="h-12 w-full rounded-xl border-[1.5px] border-line-input bg-white ps-11 pe-4 text-[15px] text-ink placeholder:text-faint focus-visible:border-accent"
        />
      </form>

      {posts.length > 0 ? (
        <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/en/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <MediaImage path={post.coverImagePath} alt={post.title} rounded={false} className="aspect-[16/9] w-full" />
              <div className="flex flex-1 flex-col p-5">
                {post.category && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-teal">{post.category}</span>}
                <h2 className="mt-1.5 font-serif text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-accent-deep">
                  {post.title}
                </h2>
                {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{post.excerpt}</p>}
                <span className="mt-4 text-sm font-bold text-accent">{b.readMore} &rarr;</span>
              </div>
            </Link>
          ))}
        </StaggerGroup>
      ) : (
        <p className="mt-10 text-muted">{b.noPosts}</p>
      )}
    </main>
  );
}
