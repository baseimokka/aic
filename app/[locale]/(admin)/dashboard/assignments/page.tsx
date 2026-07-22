import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDate } from "@/lib/utils";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, EmptyState } from "@/components/admin/page-header";

/**
 * Assignments (Operations, Phase 6). Assignments exist only for confirmed
 * bookings, so the worklist is the set of confirmed, non-archived leads — each
 * either scheduled (guide/vehicle/date) or awaiting an assignment.
 */
export default async function AssignmentsPage() {
  const actor = await requireActor();
  if (!can(actor.role, "assignments", "view")) return <NoAccess />;
  const canManage = can(actor.role, "assignments", "edit");

  const leads = await prisma.lead.findMany({
    where: { status: "CONFIRMED", archivedAt: null },
    orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
    include: {
      tour: { select: { translations: { where: { locale: "en" }, select: { title: true } } } },
      assignment: {
        select: {
          archivedAt: true,
          scheduledDate: true,
          guide: { select: { name: true } },
          vehicle: { select: { name: true } },
        },
      },
    },
  });

  const rows = leads.map((lead) => {
    const a = lead.assignment && !lead.assignment.archivedAt ? lead.assignment : null;
    return { lead, a, assigned: Boolean(a) };
  });
  const assignedCount = rows.filter((r) => r.assigned).length;

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Schedule a guide and vehicle for each confirmed booking."
      />

      <p className="mb-4 text-[13px] text-muted">
        {rows.length === 0
          ? "No confirmed bookings yet."
          : `${assignedCount} of ${rows.length} confirmed booking${rows.length === 1 ? "" : "s"} scheduled.`}
      </p>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.5fr_1.6fr_1fr_1.3fr_1.3fr_1fr_1fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Customer</span>
            <span>Tour</span>
            <span>Preferred</span>
            <span>Guide</span>
            <span>Vehicle</span>
            <span>Scheduled</span>
            <span className="text-end">Action</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>Assignments appear here once a lead is confirmed in the pipeline.</EmptyState>
          ) : (
            rows.map(({ lead, a, assigned }) => {
              const tourTitle = lead.tour?.translations[0]?.title ?? "—";
              return (
                <div
                  key={lead.id}
                  className="grid grid-cols-[1.5fr_1.6fr_1fr_1.3fr_1.3fr_1fr_1fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
                      style={{ background: assigned ? "#1f8a5b" : "#c98a16" }}
                    />
                    <span className="truncate text-sm font-bold text-ink">{lead.fullName}</span>
                  </span>
                  <span className="truncate text-[13px] text-ink-soft">{tourTitle}</span>
                  <span className="text-[13px] text-muted">
                    {lead.preferredDate ? formatDate(lead.preferredDate) : "—"}
                  </span>
                  <span className="truncate text-[13px] text-ink-soft">{a?.guide?.name ?? "—"}</span>
                  <span className="truncate text-[13px] text-ink-soft">{a?.vehicle?.name ?? "—"}</span>
                  <span className="text-[13px] text-ink-soft">
                    {a?.scheduledDate ? formatDate(a.scheduledDate) : "—"}
                  </span>
                  <span className="flex items-center justify-end">
                    <Link
                      href={`/en/dashboard/assignments/${lead.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      {canManage ? (assigned ? "Manage" : "Assign") : "View"}
                    </Link>
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
