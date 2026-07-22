import Link from "next/link";
import type { Prisma, ReviewSource } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { isLocale, localeFlags, localeNames } from "@/lib/i18n/config";
import { REVIEW_SOURCES, REVIEW_SOURCE_LABELS, REVIEW_RATINGS } from "@/lib/reviews/labels";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { ReviewVisibleToggle, ReviewFeaturedToggle } from "@/components/admin/review-toggles";
import { IconSearch } from "@/components/admin/icons";
import { controlClass } from "@/components/admin/form";
import { archiveReview, restoreReview } from "./actions";

const PAGE_SIZE = 20;
const LIST = "/en/dashboard/reviews";
const GRID = "grid-cols-[1.4fr_2.2fr_1.4fr_0.6fr_0.9fr_0.6fr_0.6fr_1fr]";

function isSource(v: string | undefined): v is ReviewSource {
  return !!v && (REVIEW_SOURCES as readonly string[]).includes(v);
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    archived?: string;
    q?: string;
    rating?: string;
    language?: string;
    source?: string;
    tour?: string;
    visible?: string;
    featured?: string;
    page?: string;
  }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "reviews", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "reviews", "edit");
  const canArchive = can(actor.role, "reviews", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";
  const q = (sp.q ?? "").trim();
  const rating = REVIEW_RATINGS.find((r) => String(r) === sp.rating);
  const language = sp.language && isLocale(sp.language) ? sp.language : undefined;
  const source = isSource(sp.source) ? sp.source : undefined;
  const tourId = (sp.tour ?? "").trim() || undefined;
  const visible = sp.visible === "1" ? true : sp.visible === "0" ? false : undefined;
  const featured = sp.featured === "1" ? true : sp.featured === "0" ? false : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.ReviewWhereInput = {
    archivedAt: archived ? { not: null } : null,
    ...(rating ? { rating } : {}),
    ...(language ? { language } : {}),
    ...(source ? { source } : {}),
    ...(tourId ? { tourId } : {}),
    ...(visible !== undefined ? { visible } : {}),
    ...(featured !== undefined ? { featured } : {}),
  };
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total, activeCount, archivedCount, tourOptions] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { tour: { select: { translations: { where: { locale: "en" }, select: { title: true } } } } },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { archivedAt: null } }),
    prisma.review.count({ where: { archivedAt: { not: null } } }),
    prisma.tour.findMany({
      where: { archivedAt: null, reviews: { some: {} } },
      select: { id: true, translations: { where: { locale: "en" }, select: { title: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || rating || language || source || tourId || visible !== undefined || featured !== undefined);

  const pageHref = (p: number) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") query.set(k, v);
    query.set("page", String(p));
    return `${LIST}?${query.toString()}`;
  };

  const tabHref = (arch: boolean) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page" && k !== "archived") query.set(k, v);
    if (arch) query.set("archived", "1");
    const qs = query.toString();
    return `${LIST}${qs ? `?${qs}` : ""}`;
  };

  const selectClass = `${controlClass} h-11 w-auto min-w-[120px] text-[13px]`;

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Customer reviews shown on tour pages; text stays in the language it was written."
        action={can(actor.role, "reviews", "create") ? <CreateLink href={`${LIST}/new`} label="New review" /> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <FilterTab href={tabHref(false)} active={!archived} label={`Active ${activeCount}`} />
          <FilterTab href={tabHref(true)} active={archived} label={`Archived ${archivedCount}`} />
        </div>
        <form method="get" className="relative" role="search">
          {archived ? <input type="hidden" name="archived" value="1" /> : null}
          {rating ? <input type="hidden" name="rating" value={rating} /> : null}
          {language ? <input type="hidden" name="language" value={language} /> : null}
          {source ? <input type="hidden" name="source" value={source} /> : null}
          {tourId ? <input type="hidden" name="tour" value={tourId} /> : null}
          {visible !== undefined ? <input type="hidden" name="visible" value={visible ? "1" : "0"} /> : null}
          {featured !== undefined ? <input type="hidden" name="featured" value={featured ? "1" : "0"} /> : null}
          <IconSearch width={16} height={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
          <label htmlFor="review-search" className="sr-only">
            Search reviews
          </label>
          <input
            id="review-search"
            name="q"
            defaultValue={q}
            placeholder="Search name or review text…"
            className="h-11 w-[240px] rounded-[9px] border-[1.5px] border-line-input bg-white ps-9 pe-3 text-[13px] text-ink outline-none focus:border-accent"
          />
        </form>
      </div>

      {/* Filters — plain GET form so the list stays a server component. */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2.5">
        {archived ? <input type="hidden" name="archived" value="1" /> : null}
        {q ? <input type="hidden" name="q" value={q} /> : null}
        <label className="sr-only" htmlFor="f-rating">Rating</label>
        <select id="f-rating" name="rating" defaultValue={rating ? String(rating) : ""} className={selectClass}>
          <option value="">Any rating</option>
          {REVIEW_RATINGS.map((r) => (
            <option key={r} value={r}>{r}★</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-language">Language</label>
        <select id="f-language" name="language" defaultValue={language ?? ""} className={selectClass}>
          <option value="">Any language</option>
          {Object.entries(localeNames).map(([code, n]) => (
            <option key={code} value={code}>{n.english}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-source">Source</label>
        <select id="f-source" name="source" defaultValue={source ?? ""} className={selectClass}>
          <option value="">Any source</option>
          {REVIEW_SOURCES.map((s) => (
            <option key={s} value={s}>{REVIEW_SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-tour">Tour</label>
        <select id="f-tour" name="tour" defaultValue={tourId ?? ""} className={`${selectClass} max-w-[220px]`}>
          <option value="">Any tour</option>
          {tourOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.translations[0]?.title ?? "Untitled tour"}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="f-visible">Visibility</label>
        <select id="f-visible" name="visible" defaultValue={visible === undefined ? "" : visible ? "1" : "0"} className={selectClass}>
          <option value="">Any visibility</option>
          <option value="1">Visible</option>
          <option value="0">Hidden</option>
        </select>
        <label className="sr-only" htmlFor="f-featured">Featured</label>
        <select id="f-featured" name="featured" defaultValue={featured === undefined ? "" : featured ? "1" : "0"} className={selectClass}>
          <option value="">Featured & not</option>
          <option value="1">Featured</option>
          <option value="0">Not featured</option>
        </select>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink hover:bg-cream"
        >
          Apply
        </button>
        {filtered ? (
          <Link href={archived ? `${LIST}?archived=1` : LIST} className="inline-flex h-11 items-center px-2 text-[13px] font-bold text-accent hover:text-accent-deep">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[1060px]">
          <div className={`grid ${GRID} gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted`}>
            <span>Customer</span>
            <span>Review</span>
            <span>Tour</span>
            <span className="text-center">Rating</span>
            <span>Source</span>
            <span className="text-center">Visible</span>
            <span className="text-center">Featured</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>
              {filtered ? (
                <>
                  No reviews match{q ? ` “${q}”` : " these filters"}.{" "}
                  <Link href={archived ? `${LIST}?archived=1` : LIST} className="font-bold text-accent">
                    Clear filters
                  </Link>
                </>
              ) : (
                <>No {archived ? "archived " : ""}reviews yet.</>
              )}
            </EmptyState>
          ) : (
            rows.map((r) => (
              <div key={r.id} className={`grid ${GRID} items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0`}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{r.customerName}</span>
                  <span className="block truncate text-xs text-faint">{r.customerCountry || "—"}</span>
                </span>
                <span className="truncate text-[13px] text-ink-soft" lang={r.language} title={r.body}>
                  {r.body}
                </span>
                <span className="truncate text-[13px] text-ink-soft">{r.tour?.translations[0]?.title ?? "—"}</span>
                <span className="text-center text-[13px] font-semibold tabular-nums text-ink-soft">{r.rating}★</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink-soft">{REVIEW_SOURCE_LABELS[r.source]}</span>
                  <span className="block text-xs text-faint">
                    {localeFlags[r.language]} {localeNames[r.language].english}
                  </span>
                </span>
                <span className="flex justify-center">
                  {canEdit ? <ReviewVisibleToggle id={r.id} visible={r.visible} /> : <span className="text-[13px] text-ink-soft">{r.visible ? "Yes" : "No"}</span>}
                </span>
                <span className="flex justify-center">
                  {canEdit ? <ReviewFeaturedToggle id={r.id} featured={r.featured} /> : <span className="text-[13px] text-ink-soft">{r.featured ? "★" : "—"}</span>}
                </span>
                <span className="flex items-center justify-end gap-2">
                  {canEdit ? (
                    <Link
                      href={`${LIST}/${r.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      Edit
                    </Link>
                  ) : null}
                  {canArchive ? (
                    <ArchiveDialog
                      id={r.id}
                      archived={Boolean(r.archivedAt)}
                      name={r.customerName}
                      entityLabel="review"
                      archiveAction={archiveReview}
                      restoreAction={restoreReview}
                      size="compact"
                    />
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-3.5 flex items-center justify-between text-[13px] text-muted">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1.5">
            <PageLink href={pageHref(page - 1)} disabled={page <= 1}>
              Previous
            </PageLink>
            <PageLink href={pageHref(page + 1)} disabled={page >= pageCount}>
              Next
            </PageLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return <span className="inline-flex h-9 items-center rounded-lg border border-line px-3.5 text-faint">{children}</span>;
  }
  return (
    <Link href={href} className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3.5 font-semibold text-ink hover:bg-cream">
      {children}
    </Link>
  );
}
