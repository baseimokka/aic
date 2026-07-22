import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { getCurrencySettings } from "@/lib/admin/currencies";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { TransferRouteForm } from "@/components/admin/transfer-route-form";
import { archiveTransferRoute, restoreTransferRoute } from "../actions";

export default async function EditTransferRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "view")) return <NoAccess />;

  const { id } = await params;
  const [route, locations, vehicles, { currencies }] = await Promise.all([
    prisma.transferRoute.findUnique({
      where: { id },
      include: {
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    }),
    prisma.transferLocation.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.transferVehicle.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getCurrencySettings(),
  ]);
  if (!route) notFound();

  const label = `${route.fromLocation.name} → ${route.toLocation.name}`;

  return (
    <div>
      <Link href="/en/dashboard/transfers/pricing" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Transfer pricing
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{label}</h2>
        {can(actor.role, "transferConfig", "delete") ? (
          <ArchiveDialog
            id={route.id}
            archived={Boolean(route.archivedAt)}
            name={label}
            entityLabel="transfer price"
            archiveAction={archiveTransferRoute}
            restoreAction={restoreTransferRoute}
            redirectTo="/en/dashboard/transfers/pricing"
          />
        ) : null}
      </div>
      <TransferRouteForm
        mode="edit"
        id={route.id}
        initial={{
          fromLocationId: route.fromLocationId,
          toLocationId: route.toLocationId,
          vehicleId: route.vehicleId ?? "",
          price: Number(route.price),
          currency: route.currency,
        }}
        locations={locations}
        vehicles={vehicles}
        currencies={currencies}
      />
    </div>
  );
}
