import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { searchTours, getFilterOptions, type TourFilterParams } from "@/lib/db/queries";
import { localizedAlternates } from "@/lib/seo";
import { TourCard } from "@/components/site/tour-card";
import { SearchSortBar } from "@/components/site/search-sort-bar";
import { FilterPanel } from "@/components/site/filter-panel";
import { Pagination } from "@/components/site/pagination";

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  return { title: getDictionary(locale).catalog.title, alternates: localizedAlternates(locale, "/tours") };
}

export default async function ToursPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const c = t.catalog;

  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const num = (v: string | string[] | undefined) => {
    const s = str(v);
    const n = s ? Number(s) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };

  const pageNum = num(sp.page);
  const page = pageNum && pageNum >= 1 ? Math.floor(pageNum) : 1;

  const filters: TourFilterParams = {
    q: str(sp.q),
    category: str(sp.category),
    destination: str(sp.destination),
    tourType: str(sp.type),
    duration: str(sp.duration),
    priceMin: num(sp.priceMin),
    priceMax: num(sp.priceMax),
    family: str(sp.family) === "1",
    couple: str(sp.couple) === "1",
    solo: str(sp.solo) === "1",
    sort: str(sp.sort) ?? "featured",
    page,
    pageSize: PAGE_SIZE,
  };

  const [{ tours, total }, options] = await Promise.all([searchTours(locale, filters), getFilterOptions(locale)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A page number past the end (deep link / tampered URL) would render the empty
  // state despite matches existing — send it to the last valid page instead.
  if (page > totalPages) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page") continue;
      const val = Array.isArray(v) ? v[0] : v;
      if (val) p.set(k, val);
    }
    if (totalPages > 1) p.set("page", String(totalPages));
    const qs = p.toString();
    redirect(`/${locale}/tours${qs ? `?${qs}` : ""}`);
  }

  const current = {
    category: filters.category ?? "",
    destination: filters.destination ?? "",
    type: filters.tourType ?? "",
    duration: filters.duration ?? "",
    priceMin: filters.priceMin !== undefined ? String(filters.priceMin) : "",
    priceMax: filters.priceMax !== undefined ? String(filters.priceMax) : "",
    family: !!filters.family,
    couple: !!filters.couple,
    solo: !!filters.solo,
  };

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-12">
      <nav className="text-[13px] text-faint" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="text-muted hover:text-ink">
          {t.nav.home}
        </Link>{" "}
        / <span className="font-semibold text-ink">{c.title}</span>
      </nav>
      <h1 className="mt-2 font-serif text-[34px] font-semibold text-ink">{c.heading}</h1>
      <p className="mt-1 text-[15px] text-muted">
        {total} {total === 1 ? c.resultsOne : c.resultsMany}
      </p>

      <div className="mt-6">
        <SearchSortBar labels={c} initialQuery={filters.q ?? ""} sort={filters.sort ?? "featured"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside>
          <FilterPanel options={options} labels={c} current={current} />
        </aside>

        <div>
          {tours.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tours.map((tour) => (
                <TourCard key={tour.slug} tour={tour} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-white px-6 py-16 text-center shadow-card">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--color-accent)" strokeWidth={1.8} aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4-4" />
                </svg>
              </span>
              <h2 className="font-serif text-xl font-semibold text-ink">{c.noResultsTitle}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{c.noResultsBody}</p>
              <Link
                href={`/${locale}/tours`}
                className="mt-5 inline-flex h-11 items-center rounded-[10px] border-[1.5px] border-ink bg-white px-5 text-sm font-bold text-ink hover:bg-surface-2"
              >
                {c.clear}
              </Link>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} labels={c} />
        </div>
      </div>
    </main>
  );
}
