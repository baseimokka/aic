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
import { archiveFaq, restoreFaq } from "./actions";

export default async function FaqPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "faqs", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "faqs", "edit");
  const canArchive = can(actor.role, "faqs", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.faq.findMany({
      where: { tourId: null, archivedAt: archived ? { not: null } : null },
      orderBy: { order: "asc" },
      include: { translations: { where: { locale: "en" }, select: { question: true } } },
    }),
    prisma.faq.count({ where: { tourId: null, archivedAt: null } }),
    prisma.faq.count({ where: { tourId: null, archivedAt: { not: null } } }),
  ]);

  const trLocales = await loadListLocales("faq", rows.map((r) => r.id));

  return (
    <div>
      <PageHeader
        title="FAQ"
        description="Site-wide questions shown on the public FAQ page. (Tour-specific FAQs live in each tour.)"
        action={can(actor.role, "faqs", "create") ? <CreateLink href="/en/dashboard/faq/new" label="New question" /> : undefined}
      />

      <div className="mb-4 flex gap-2">
        <FilterTab href="/en/dashboard/faq" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/faq?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[3fr_0.7fr_1.6fr_1.1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Question</span>
            <span className="text-center">Order</span>
            <span>Languages</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}questions yet.</EmptyState>
          ) : (
            rows.map((f) => {
              const question = f.translations[0]?.question ?? "(untitled)";
              return (
                <div key={f.id} className="grid grid-cols-[3fr_0.7fr_1.6fr_1.1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                  <span className="truncate text-sm font-semibold text-ink">{question}</span>
                  <span className="text-center text-[13px] text-ink-soft">{f.order}</span>
                  <TranslationColumn locales={trLocales.get(f.id) ?? new Set<string>()} href={`/en/dashboard/faq/${f.id}`} />
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/faq/${f.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={f.id}
                        archived={Boolean(f.archivedAt)}
                        name={question}
                        entityLabel="question"
                        archiveAction={archiveFaq}
                        restoreAction={restoreFaq}
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
