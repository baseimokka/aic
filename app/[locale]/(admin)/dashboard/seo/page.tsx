import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader } from "@/components/admin/page-header";
import { IconCheck } from "@/components/admin/icons";

interface SeoRow {
  id: string;
  label: string;
  href: string;
  hasTitle: boolean;
  hasDescription: boolean;
}

function coverage(rows: SeoRow[]): number {
  if (rows.length === 0) return 100;
  const complete = rows.filter((r) => r.hasTitle && r.hasDescription).length;
  return Math.round((complete / rows.length) * 100);
}

export default async function SeoPage() {
  const actor = await requireActor();
  if (!can(actor.role, "seo", "view")) return <NoAccess />;

  const [tours, posts, destinations] = await Promise.all([
    prisma.tour.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { translations: { where: { locale: "en" }, select: { title: true, seoTitle: true, metaDescription: true } } },
    }),
    prisma.blogPost.findMany({
      where: { archivedAt: null },
      orderBy: { updatedAt: "desc" },
      include: { translations: { where: { locale: "en" }, select: { title: true, seoTitle: true, metaDescription: true } } },
    }),
    prisma.destination.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      include: { translations: { where: { locale: "en" }, select: { name: true, seoTitle: true, metaDescription: true } } },
    }),
  ]);

  const tourRows: SeoRow[] = tours.map((t) => ({
    id: t.id,
    label: t.translations[0]?.title ?? t.slug,
    href: `/en/dashboard/tours/${t.id}`,
    hasTitle: Boolean(t.translations[0]?.seoTitle),
    hasDescription: Boolean(t.translations[0]?.metaDescription),
  }));
  const postRows: SeoRow[] = posts.map((p) => ({
    id: p.id,
    label: p.translations[0]?.title ?? p.slug,
    href: `/en/dashboard/blog/${p.id}`,
    hasTitle: Boolean(p.translations[0]?.seoTitle),
    hasDescription: Boolean(p.translations[0]?.metaDescription),
  }));
  const destRows: SeoRow[] = destinations.map((d) => ({
    id: d.id,
    label: d.translations[0]?.name ?? d.slug,
    href: `/en/dashboard/destinations/${d.id}`,
    hasTitle: Boolean(d.translations[0]?.seoTitle),
    hasDescription: Boolean(d.translations[0]?.metaDescription),
  }));

  const sections = [
    { title: "Tours", rows: tourRows },
    { title: "Blog posts", rows: postRows },
    { title: "Destinations", rows: destRows },
  ];

  return (
    <div>
      <PageHeader title="SEO" description="Metadata coverage across indexable content. Edit each item's SEO in its editor." />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{s.title}</div>
            <div className="mt-2 font-serif text-4xl font-semibold text-ink">{coverage(s.rows)}%</div>
            <div className="mt-1 text-[12px] text-faint">{s.rows.filter((r) => r.hasTitle && r.hasDescription).length}/{s.rows.length} fully tagged</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-white p-4 text-[13px] text-muted shadow-card">
        <span className="font-bold text-ink">Technical SEO</span> — sitemap, robots.txt, canonical URLs, hreflang and JSON-LD are generated automatically for all published content.
      </div>

      {sections.map((s) => (
        <section key={s.title} className="mt-6">
          <h3 className="mb-3 text-sm font-extrabold text-ink">{s.title}</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[2.6fr_1fr_1fr_0.8fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                <span>Item</span>
                <span className="text-center">SEO title</span>
                <span className="text-center">Meta description</span>
                <span className="text-end">Edit</span>
              </div>
              {s.rows.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">Nothing here yet.</p>
              ) : (
                s.rows.map((r) => (
                  <div key={r.id} className="grid grid-cols-[2.6fr_1fr_1fr_0.8fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                    <span className="truncate text-sm font-semibold text-ink">{r.label}</span>
                    <span className="flex justify-center"><Indicator ok={r.hasTitle} /></span>
                    <span className="flex justify-center"><Indicator ok={r.hasDescription} /></span>
                    <span className="flex justify-end">
                      <Link href={r.href} className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream">Edit</Link>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function Indicator({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e4f3eb] text-[#0f6b43]" aria-label="Set">
      <IconCheck width={13} height={13} />
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-bold text-[#9a5a00]" aria-label="Missing">
      Missing
    </span>
  );
}
