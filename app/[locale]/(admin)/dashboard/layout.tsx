import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: { default: "Management Console", template: "%s · AIC Console" },
  robots: { index: false, follow: false },
};

/**
 * The real admin gate (§11): the proxy only checks cookie presence; this
 * layout resolves the session server-side and bounces anonymous visitors.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect("/en/login");

  const [unreadCount, recent, newLeads] = await Promise.all([
    prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, event: true, title: true, body: true, linkUrl: true, readAt: true, createdAt: true },
    }),
    can(actor.role, "leads", "view")
      ? prisma.lead.count({ where: { status: "NEW", archivedAt: null } })
      : Promise.resolve(0),
  ]);

  return (
    <AdminShell
      user={{ id: user.id, name: user.name ?? user.email, role: user.role }}
      newLeads={newLeads}
      unreadCount={unreadCount}
      notifications={recent.map((n) => ({
        id: n.id,
        event: n.event,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      }))}
    >
      {children}
    </AdminShell>
  );
}
