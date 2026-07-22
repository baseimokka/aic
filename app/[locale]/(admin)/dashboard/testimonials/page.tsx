import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { loadListLocales } from "@/lib/translation/db";
import { TranslationColumn } from "@/components/admin/translations/column";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { archiveTestimonial, restoreTestimonial } from "./actions";

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "testimonials", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "testimonials", "edit");
  const canArchive = can(actor.role, "testimonials", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.testimonial.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { order: "asc" },
      include: { translations: { where: { locale: "en" }, select: { quote: true } } },
    }),
    prisma.testimonial.count({ where: { archivedAt: null } }),
    prisma.testimonial.count({ where: { archivedAt: { not: null } } }),
  ]);

  const trLocales = await loadListLocales("testimonial", rows.map((r) => r.id));

  return (
    <div>
      <PageHeader
        title="Testimonials"
        description="Traveler quotes; featured ones appear on the homepage."
        action={can(actor.role, "testimonials", "create") ? <CreateLink href="/en/dashboard/testimonials/new" label="New testimonial" /> : undefined}
      />

      <div className="mb-4 flex gap-2">
        <FilterTab href="/en/dashboard/testimonials" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/testimonials?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-[1.4fr_2.6fr_0.8fr_0.9fr_1.5fr_1.1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Author</span>
            <span>Quote</span>
            <span className="text-center">Rating</span>
            <span className="text-center">Featured</span>
            <span>Languages</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}testimonials yet.</EmptyState>
          ) : (
            rows.map((t) => {
              const quote = t.translations[0]?.quote ?? "";
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[1.4fr_2.6fr_0.8fr_0.9fr_1.5fr_1.1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{t.authorName}</span>
                    <span className="block truncate text-xs text-faint">{t.authorCountry || "—"}</span>
                  </span>
                  <span className="truncate text-[13px] text-ink-soft">{quote}</span>
                  <span className="text-center text-[13px] text-ink-soft">{t.rating ? `${t.rating}★` : "—"}</span>
                  <span className="text-center text-[13px] text-ink-soft">{t.featured ? "★" : "—"}</span>
                  <TranslationColumn locales={trLocales.get(t.id) ?? new Set<string>()} href={`/en/dashboard/testimonials/${t.id}`} />
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/testimonials/${t.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={t.id}
                        archived={Boolean(t.archivedAt)}
                        name={t.authorName}
                        entityLabel="testimonial"
                        archiveAction={archiveTestimonial}
                        restoreAction={restoreTestimonial}
                        size="compact"
                      />
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
