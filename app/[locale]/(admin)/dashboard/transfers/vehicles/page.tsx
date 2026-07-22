import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { ActivePill } from "@/components/admin/pills";
import { archiveTransferVehicle, restoreTransferVehicle } from "./actions";

export default async function TransferVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "transferConfig", "edit");
  const canArchive = can(actor.role, "transferConfig", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.transferVehicle.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: { name: "asc" },
      include: { _count: { select: { requests: true } } },
    }),
    prisma.transferVehicle.count({ where: { archivedAt: null } }),
    prisma.transferVehicle.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Transfer vehicles"
        description="The vehicle options visitors choose from on the public transfer form."
        action={
          can(actor.role, "transferConfig", "create") ? (
            <CreateLink href="/en/dashboard/transfers/vehicles/new" label="New vehicle" />
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2 text-[13px]">
        <FilterTab href="/en/dashboard/transfers/vehicles" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/transfers/vehicles?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[2fr_1fr_1.1fr_0.9fr_1.2fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Name</span>
            <span className="text-center">Capacity</span>
            <span>Status</span>
            <span className="text-center">Requests</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}transfer vehicles yet.</EmptyState>
          ) : (
            rows.map((veh) => (
              <div
                key={veh.id}
                className="grid grid-cols-[2fr_1fr_1.1fr_0.9fr_1.2fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
              >
                <span className="truncate text-sm font-bold text-ink">{veh.name}</span>
                <span className="text-center text-[13px] text-ink-soft">{veh.capacity}</span>
                <span>
                  <ActivePill active={veh.active} />
                </span>
                <span className="text-center text-[13px] text-ink-soft">{veh._count.requests}</span>
                <span className="flex items-center justify-end gap-2">
                  {canEdit ? (
                    <Link
                      href={`/en/dashboard/transfers/vehicles/${veh.id}`}
                      className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      Edit
                    </Link>
                  ) : null}
                  {canArchive ? (
                    <ArchiveDialog
                      id={veh.id}
                      archived={Boolean(veh.archivedAt)}
                      name={veh.name}
                      entityLabel="transfer vehicle"
                      archiveAction={archiveTransferVehicle}
                      restoreAction={restoreTransferVehicle}
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
