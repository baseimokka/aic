import Link from "next/link";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { TransferLocationForm } from "@/components/admin/transfer-location-form";

export default async function NewTransferLocationPage() {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "create")) return <NoAccess />;

  return (
    <div>
      <Link href="/en/dashboard/transfers/locations" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Transfer locations
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New transfer location</h2>
      <TransferLocationForm mode="create" initial={{ name: "", active: true }} />
    </div>
  );
}
