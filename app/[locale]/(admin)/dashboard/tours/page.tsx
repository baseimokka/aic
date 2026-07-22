import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { loadListLocales } from "@/lib/translation/db";
import { TranslationColumn } from "@/components/admin/translations/column";
import { formatMoney } from "@/lib/utils";
import { resolvePricing } from "@/lib/pricing";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { IconSearch } from "@/components/admin/icons";
import { MediaImage } from "@/components/ui/media-image";
import { archiveTour, restoreTour } from "./actions";

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; q?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "tours", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "tours", "edit");
  const canArchive = can(actor.role, "tours", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";
  const q = (sp.q ?? "").trim();

  const where: Prisma.TourWhereInput = { archivedAt: archived ? { not: null } : null };
  if (q) where.translations = { some: { locale: "en", title: { contains: q, mode: "insensitive" } } };

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.tour.findMany({
      where,
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      include: {
        translations: { where: { locale: "en" }, select: { title: true } },
        category: { include: { translations: { where: { locale: "en" }, select: { name: true } } } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { path: true } },
        _count: { select: { images: true } },
      },
    }),
    prisma.tour.count({ where: { archivedAt: null } }),
    prisma.tour.count({ where: { archivedAt: { not: null } } }),
  ]);

  const trLocales = await loadListLocales("tour", rows.map((r) => r.id));

  const searchHref = (archivedFlag: boolean) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (archivedFlag) p.set("archived", "1");
    const qs = p.toString();
    return `/en/dashboard/tours${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Tours"
        description="Every tour on the site — content, pricing, images, FAQ and SEO."
        action={can(actor.role, "tours", "create") ? <CreateLink href="/en/dashboard/tours/new" label="New tour" /> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <FilterTab href={searchHref(false)} active={!archived} label={`Active ${activeCount}`} />
          <FilterTab href={searchHref(true)} active={archived} label={`Archived ${archivedCount}`} />
        </div>
        <form method="get" className="relative" role="search">
          {archived ? <input type="hidden" name="archived" value="1" /> : null}
          <IconSearch width={16} height={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
          <label htmlFor="tour-search" className="sr-only">Search tours</label>
          <input id="tour-search" name="q" defaultValue={q} placeholder="Search tours…" className="h-11 w-[220px] rounded-[9px] border-[1.5px] border-line-input bg-white ps-9 pe-3 text-[13px] text-ink outline-none focus:border-accent" />
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[56px_2.2fr_1.2fr_1fr_1fr_1.5fr_1.1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span></span>
            <span>Title</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span>Languages</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>
              No {archived ? "archived " : ""}tours{q ? ` match “${q}”` : ""}.{" "}
              {q ? <Link href={searchHref(archived)} className="font-bold text-accent">Clear search</Link> : null}
            </EmptyState>
          ) : (
            rows.map((t) => {
              const title = t.translations[0]?.title ?? t.slug;
              const pricing = resolvePricing({
                basePrice: Number(t.basePrice),
                discountType: t.discountType,
                discountValue: t.discountValue == null ? null : Number(t.discountValue),
                discountStartsAt: t.discountStartsAt,
                discountEndsAt: t.discountEndsAt,
              });
              return (
                <div key={t.id} className="grid grid-cols-[56px_2.2fr_1.2fr_1fr_1fr_1.5fr_1.1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                  <MediaImage path={t.images[0]?.path ?? null} alt="" rounded className="h-10 w-14" sizes="56px" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{title}</span>
                    <span className="block truncate text-[11px] text-faint">{t._count.images} image{t._count.images === 1 ? "" : "s"} · {t.durationDays}d</span>
                  </span>
                  <span className="truncate text-[13px] text-ink-soft">{t.category?.translations[0]?.name ?? "—"}</span>
                  <span className="text-[13px] font-bold tabular-nums text-ink">
                    {pricing.discountPercent != null ? (
                      <>
                        <s className="me-1 font-semibold text-faint">{formatMoney(pricing.basePrice, t.currency)}</s>
                        {formatMoney(pricing.effectivePrice, t.currency)}
                      </>
                    ) : (
                      formatMoney(pricing.basePrice, t.currency)
                    )}
                  </span>
                  <span>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${t.status === "ACTIVE" ? "bg-[#e4f3eb] text-[#0f6b43]" : t.status === "ARCHIVED" ? "bg-surface-2 text-muted" : "bg-warning-soft text-[#9a5a00]"}`}>
                      {t.status === "ACTIVE" ? "Published" : t.status === "ARCHIVED" ? "Archived" : "Hidden"}
                    </span>
                  </span>
                  <TranslationColumn locales={trLocales.get(t.id) ?? new Set<string>()} href={`/en/dashboard/tours/${t.id}`} />
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link href={`/en/dashboard/tours/${t.id}`} className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream">
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog id={t.id} archived={Boolean(t.archivedAt)} name={title} entityLabel="tour" archiveAction={archiveTour} restoreAction={restoreTour} size="compact" />
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
