import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { TransferLocationForm } from "@/components/admin/transfer-location-form";
import { archiveTransferLocation, restoreTransferLocation } from "../actions";

export default async function EditTransferLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "transferConfig", "view")) return <NoAccess />;

  const { id } = await params;
  const location = await prisma.transferLocation.findUnique({ where: { id } });
  if (!location) notFound();

  return (
    <div>
      <Link href="/en/dashboard/transfers/locations" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Transfer locations
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{location.name}</h2>
        {can(actor.role, "transferConfig", "delete") ? (
          <ArchiveDialog
            id={location.id}
            archived={Boolean(location.archivedAt)}
            name={location.name}
            entityLabel="transfer location"
            archiveAction={archiveTransferLocation}
            restoreAction={restoreTransferLocation}
            redirectTo="/en/dashboard/transfers/locations"
          />
        ) : null}
      </div>
      <TransferLocationForm
        mode="edit"
        id={location.id}
        initial={{ name: location.name, active: location.active }}
      />
    </div>
  );
}
