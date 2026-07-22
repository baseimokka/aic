import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { loadListLocales } from "@/lib/translation/db";
import { TranslationColumn } from "@/components/admin/translations/column";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, EmptyState } from "@/components/admin/page-header";
import { SectionEnableToggle } from "@/components/admin/section-enable-toggle";

// The homepage renders a fixed set of sections in a fixed layout (see the public
// homepage). Only these keys are surfaced in the admin — anything else in the
// table would be an editor with no effect on the live page. Order here mirrors
// the on-page order and is the single source of truth for which rows show.
const SECTION_LABELS: Record<string, string> = {
  "featured-tours": "Featured tours",
  "why-us": "Why travel with us",
  destinations: "Popular destinations",
  about: "Partnership & testimonial",
  "latest-blog": "From the journal",
  "contact-cta": "Contact call-to-action",
};
const RENDERED_KEYS = Object.keys(SECTION_LABELS);

export default async function HomepagePage() {
  const actor = await requireActor();
  if (!can(actor.role, "homepage", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "homepage", "edit");

  const sections = await prisma.homepageSection.findMany({
    where: { key: { in: RENDERED_KEYS } },
    orderBy: { order: "asc" },
    include: { translations: { where: { locale: "en" }, select: { heading: true } } },
  });

  const trLocales = await loadListLocales("homepage", sections.map((s) => s.id));

  return (
    <div>
      <PageHeader title="Homepage" description="Edit the copy, order and visibility of each homepage section." />

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[880px]">
          <div className="grid grid-cols-[0.5fr_1.6fr_2fr_0.9fr_1.5fr_0.9fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span className="text-center">Order</span>
            <span>Section</span>
            <span>Heading</span>
            <span className="text-center">Visible</span>
            <span>Languages</span>
            <span className="text-end">Edit</span>
          </div>
          {sections.length === 0 ? (
            <EmptyState>No homepage sections found — run the database seed.</EmptyState>
          ) : (
            sections.map((s) => (
              <div key={s.id} className="grid grid-cols-[0.5fr_1.6fr_2fr_0.9fr_1.5fr_0.9fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
                <span className="text-center text-[13px] font-bold text-faint">{s.order}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink">{SECTION_LABELS[s.key] ?? s.key}</span>
                  <span className="block truncate font-mono text-[11px] text-faint">{s.key}</span>
                </span>
                <span className="truncate text-[13px] text-ink-soft">{s.translations[0]?.heading ?? "—"}</span>
                <span className="flex justify-center">
                  {canEdit ? <SectionEnableToggle id={s.id} enabled={s.enabled} /> : <span className="text-[13px] text-ink-soft">{s.enabled ? "Yes" : "No"}</span>}
                </span>
                <TranslationColumn locales={trLocales.get(s.id) ?? new Set<string>()} href={`/en/dashboard/homepage/${s.id}`} />
                <span className="flex justify-end">
                  {canEdit ? (
                    <Link
                      href={`/en/dashboard/homepage/${s.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      Edit
                    </Link>
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
