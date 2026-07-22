import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconArchive, IconBack } from "@/components/admin/icons";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { UserEditForm } from "@/components/admin/user-edit-form";
import { archiveUser, restoreUser } from "../actions";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "users", "view")) return <NoAccess />;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, archivedAt: true },
  });
  if (!user) notFound();

  const name = user.name ?? user.email;
  const isSelf = user.id === actor.id;

  return (
    <div>
      <Link href="/en/dashboard/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Users
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{name}</h2>
        {can(actor.role, "users", "delete") && !isSelf ? (
          <ArchiveDialog
            id={user.id}
            archived={Boolean(user.archivedAt)}
            name={name}
            entityLabel="user"
            archiveAction={archiveUser}
            restoreAction={restoreUser}
            redirectTo="/en/dashboard/users"
          />
        ) : null}
      </div>

      {user.archivedAt ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[11px] border border-[#f0deb0] bg-warning-soft px-4 py-3 text-[13px] font-semibold text-[#9a5a00]">
          <IconArchive width={16} height={16} />
          This account is archived — the user can&rsquo;t sign in until it&rsquo;s restored.
        </div>
      ) : null}

      <UserEditForm id={user.id} email={user.email} isSelf={isSelf} initial={{ name: user.name ?? "", role: user.role }} />
    </div>
  );
}
