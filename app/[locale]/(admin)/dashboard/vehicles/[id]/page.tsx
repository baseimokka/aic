import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { VehicleForm } from "@/components/admin/vehicle-form";
import { archiveVehicle, restoreVehicle } from "../actions";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "vehicles", "view")) return <NoAccess />;

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) notFound();

  return (
    <div>
      <Link href="/en/dashboard/vehicles" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Vehicles
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{vehicle.name}</h2>
        {can(actor.role, "vehicles", "delete") ? (
          <ArchiveDialog
            id={vehicle.id}
            archived={Boolean(vehicle.archivedAt)}
            name={vehicle.name}
            entityLabel="vehicle"
            archiveAction={archiveVehicle}
            restoreAction={restoreVehicle}
            redirectTo="/en/dashboard/vehicles"
          />
        ) : null}
      </div>
      <VehicleForm
        mode="edit"
        id={vehicle.id}
        initial={{ name: vehicle.name, type: vehicle.type, capacity: vehicle.capacity, status: vehicle.status }}
      />
    </div>
  );
}
