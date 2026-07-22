import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac/labels";
import { Avatar } from "@/components/admin/avatar";
import { NoAccess } from "@/components/admin/no-access";
import { PageHeader, CreateLink, EmptyState } from "@/components/admin/page-header";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { FilterTab } from "@/components/admin/filter-tab";
import { archiveUser, restoreUser } from "./actions";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const actor = await requireActor();
  if (!can(actor.role, "users", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "users", "edit");
  const canArchive = can(actor.role, "users", "delete");

  const sp = await searchParams;
  const archived = sp.archived === "1";

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.user.findMany({
      where: { archivedAt: archived ? { not: null } : null },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true, role: true, createdAt: true, archivedAt: true },
    }),
    prisma.user.count({ where: { archivedAt: null } }),
    prisma.user.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Staff accounts and their roles. Roles govern every module's access."
        action={can(actor.role, "users", "create") ? <CreateLink href="/en/dashboard/users/new" label="New user" /> : undefined}
      />

      <div className="mb-4 flex gap-2 text-[13px]">
        <FilterTab href="/en/dashboard/users" active={!archived} label={`Active ${activeCount}`} />
        <FilterTab href="/en/dashboard/users?archived=1" active={archived} label={`Archived ${archivedCount}`} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[2fr_2fr_1.4fr_1fr_1.2fr] gap-3 border-b border-line bg-cream px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Added</span>
            <span className="text-end">Actions</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState>No {archived ? "archived " : ""}users.</EmptyState>
          ) : (
            rows.map((u) => {
              const name = u.name ?? u.email;
              const isSelf = u.id === actor.id;
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-[2fr_2fr_1.4fr_1fr_1.2fr] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={name} seed={u.id} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">
                        {name}
                        {isSelf ? <span className="ms-1.5 text-[11px] font-bold text-accent">You</span> : null}
                      </span>
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-muted">{u.email}</span>
                  <span className="text-[13px] font-semibold text-ink-soft">{ROLE_LABELS[u.role]}</span>
                  <span className="text-[13px] text-faint">{formatDate(u.createdAt)}</span>
                  <span className="flex items-center justify-end gap-2">
                    {canEdit ? (
                      <Link
                        href={`/en/dashboard/users/${u.id}`}
                        className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                      >
                        Edit
                      </Link>
                    ) : null}
                    {canArchive && !isSelf ? (
                      <ArchiveDialog
                        id={u.id}
                        archived={Boolean(u.archivedAt)}
                        name={name}
                        entityLabel="user"
                        archiveAction={archiveUser}
                        restoreAction={restoreUser}
                        size="compact"
                      />
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
