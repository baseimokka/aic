import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { TransferVehicleForm } from "@/components/admin/transfer-vehicle-form";
import { archiveTransferVehicle, restoreTransferVehicle } from "../actions";

export default async function EditTransferVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "view")) return <NoAccess />;

  const { id } = await params;
  const vehicle = await prisma.transferVehicle.findUnique({ where: { id } });
  if (!vehicle) notFound();

  return (
    <div>
      <Link href="/en/dashboard/transfers/vehicles" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Transfer vehicles
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{vehicle.name}</h2>
        {can(actor.role, "transferConfig", "delete") ? (
          <ArchiveDialog
            id={vehicle.id}
            archived={Boolean(vehicle.archivedAt)}
            name={vehicle.name}
            entityLabel="transfer vehicle"
            archiveAction={archiveTransferVehicle}
            restoreAction={restoreTransferVehicle}
            redirectTo="/en/dashboard/transfers/vehicles"
          />
        ) : null}
      </div>
      <TransferVehicleForm
        mode="edit"
        id={vehicle.id}
        initial={{ name: vehicle.name, capacity: vehicle.capacity, active: vehicle.active }}
      />
    </div>
  );
}
