import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { getCurrencySettings } from "@/lib/admin/currencies";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { TransferRouteForm } from "@/components/admin/transfer-route-form";

export default async function NewTransferRoutePage() {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "create")) return <NoAccess />;

  const [locations, vehicles, { currencies, defaultCurrency }] = await Promise.all([
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

  return (
    <div>
      <Link href="/en/dashboard/transfers/pricing" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Transfer pricing
      </Link>
      <h2 className="mb-5 font-serif text-2xl font-semibold text-ink">New transfer price</h2>
      <TransferRouteForm
        mode="create"
        initial={{ fromLocationId: "", toLocationId: "", vehicleId: "", price: 0, currency: defaultCurrency }}
        locations={locations}
        vehicles={vehicles}
        currencies={currencies}
      />
    </div>
  );
}
