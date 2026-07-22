import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { GuideAvailabilityPill } from "@/components/admin/pills";
import { archiveGuide, restoreGuide } from "./actions";

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "guides", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "guides", "edit");
  const canArchive = can(actor.role, "guides", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.guide.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { name: "asc" },
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.guide.count({ where: { archivedAt: null } }),
    prisma.guide.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Guides"
        description="The tour-guide roster available to assign to confirmed bookings."
        action={can(actor.role, "guides", "create") ? <CreateLink href="/en/dashboard/guides/new" label="New guide" /> : undefined}
      />

      <div className="mb-4 flex gap-2 text-[13px]">
        <FilterTab href="/en/dashboard/guides" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/guides?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1.6fr_2fr_1.4fr_1fr_0.9fr_1.2fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Name</span>
            <span>Languages</span>
            <span>Contact</span>
            <span>Availability</span>
            <span className="text-center">Trips</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}guides yet.</EmptyState>
          ) : (
            rows.map((g) => (
              <div
                key={g.id}
                className="grid grid-cols-[1.6fr_2fr_1.4fr_1fr_0.9fr_1.2fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
              >
                <span className="truncate text-sm font-bold text-ink">{g.name}</span>
                <span className="truncate text-[13px] text-ink-soft">
                  {g.languages.length ? g.languages.join(", ") : "—"}
                </span>
                <span className="truncate text-[13px] text-muted">{g.contact ?? "—"}</span>
                <span>
                  <GuideAvailabilityPill status={g.availabilityStatus} />
                </span>
                <span className="text-center text-[13px] text-ink-soft">{g._count.assignments}</span>
                <span className="flex items-center justify-end gap-2">
                  {canEdit ? (
                    <Link
                      href={`/en/dashboard/guides/${g.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      Edit
                    </Link>
                  ) : null}
                  {canArchive ? (
                    <ArchiveDialog
                      id={g.id}
                      archived={Boolean(g.archivedAt)}
                      name={g.name}
                      entityLabel="guide"
                      archiveAction={archiveGuide}
                      restoreAction={restoreGuide}
                      size="compact"
                    />
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
