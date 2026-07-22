import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { TransferVehicleForm } from "@/components/admin/transfer-vehicle-form";

export default async function NewTransferVehiclePage() {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/transfers/vehicles" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Transfer vehicles
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New transfer vehicle</h2>
      <TransferVehicleForm mode="create" initial={{ name: "", capacity: 4, active: true }} />
    </div>
  );
}
