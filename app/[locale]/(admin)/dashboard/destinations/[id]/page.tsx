import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { TranslationsSection } from "@/components/admin/translations/section";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { DestinationForm } from "@/components/admin/destination-form";
import { archiveDestination, restoreDestination } from "../actions";

export default async function EditDestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "destinations", "view")) return <NoAccess />;

  const { id } = await params;
  const dest = await prisma.destination.findUnique({
    where: { id },
    include: {
      translations: {
        where: { locale: "en" },
        select: { name: true, description: true, seoTitle: true, metaDescription: true },
      },
    },
  });
  if (!dest) notFound();

  const en = dest.translations[0];
  const name = en?.name ?? dest.slug;

  return (
    <div>
      <Link href="/en/dashboard/destinations" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Destinations
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{name}</h2>
        {can(actor.role, "destinations", "delete") ? (
          <ArchiveDialog
            id={dest.id}
            archived={Boolean(dest.archivedAt)}
            name={name}
            entityLabel="destination"
            archiveAction={archiveDestination}
            restoreAction={restoreDestination}
            redirectTo="/en/dashboard/destinations"
          />
        ) : null}
      </div>
      <DestinationForm
        mode="edit"
        id={dest.id}
        initial={{
          name: en?.name ?? "",
          slug: dest.slug,
          description: en?.description ?? "",
          heroImagePath: dest.heroImagePath,
          order: dest.order,
          featured: dest.featured,
          seoTitle: en?.seoTitle ?? "",
          metaDescription: en?.metaDescription ?? "",
        }}
      />

      <div className="mt-8">
        <TranslationsSection entityType="destination" entityId={dest.id} />
      </div>
    </div>
  );
}
