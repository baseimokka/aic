import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { VehicleForm } from "@/components/admin/vehicle-form";

export default async function NewVehiclePage() {
  const actor = await requireActor();
  if (!can(actor.role, "vehicles", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/vehicles" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Vehicles
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New vehicle</h2>
      <VehicleForm mode="create" initial={{ name: "", type: "", capacity: 4, status: "ACTIVE" }} />
    </div>
  );
}
