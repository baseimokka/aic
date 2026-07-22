import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatMoney } from "@/lib/utils";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { archiveTransferRoute, restoreTransferRoute } from "./actions";

export default async function TransferPricingPage({
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
    prisma.transferRoute.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: [{ createdAt: "desc" }],
      include: {
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        vehicle: { select: { name: true } },
      },
    }),
    prisma.transferRoute.count({ where: { archivedAt: null } }),
    prisma.transferRoute.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Transfer pricing"
        description="One price per route and direction. A vehicle-specific price overrides the route's “any vehicle” price."
        action={
          can(actor.role, "transferConfig", "create") ? (
            <CreateLink href="/en/dashboard/transfers/pricing/new" label="New price" />
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2 text-[13px]">
        <FilterTab href="/en/dashboard/transfers/pricing" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/transfers/pricing?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[2.2fr_1.4fr_1fr_1.2fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Route</span>
            <span>Vehicle</span>
            <span>Price</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}transfer prices yet.</EmptyState>
          ) : (
            rows.map((route) => {
              const label = `${route.fromLocation.name} → ${route.toLocation.name}`;
              return (
                <div
                  key={route.id}
                  className="grid grid-cols-[2.2fr_1.4fr_1fr_1.2fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <span className="truncate text-sm font-bold text-ink">{label}</span>
                  <span className="truncate text-[13px] text-ink-soft">
                    {route.vehicle?.name ?? <span className="text-faint">Any vehicle</span>}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-ink">
                    {formatMoney(Number(route.price), route.currency)}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/transfers/pricing/${route.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive ? (
                      <ArchiveDialog
                        id={route.id}
                        archived={Boolean(route.archivedAt)}
                        name={label}
                        entityLabel="transfer price"
                        archiveAction={archiveTransferRoute}
                        restoreAction={restoreTransferRoute}
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
