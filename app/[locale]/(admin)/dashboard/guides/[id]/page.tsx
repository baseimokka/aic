import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { GuideForm } from "@/components/admin/guide-form";
import { archiveGuide, restoreGuide } from "../actions";

export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "guides", "view")) return <NoAccess />;

  const { id } = await params;
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();

  return (
    <div>
      <Link href="/en/dashboard/guides" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Guides
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{guide.name}</h2>
        {can(actor.role, "guides", "delete") ? (
          <ArchiveDialog
            id={guide.id}
            archived={Boolean(guide.archivedAt)}
            name={guide.name}
            entityLabel="guide"
            archiveAction={archiveGuide}
            restoreAction={restoreGuide}
            redirectTo="/en/dashboard/guides"
          />
        ) : null}
      </div>
      <GuideForm
        mode="edit"
        id={guide.id}
        initial={{
          name: guide.name,
          languages: guide.languages,
          contact: guide.contact ?? "",
          availabilityStatus: guide.availabilityStatus,
        }}
      />
    </div>
  );
}
