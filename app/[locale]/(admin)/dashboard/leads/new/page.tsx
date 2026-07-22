import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { NoAccess } from "@/components/admin/no-access";
import { IconBack } from "@/components/admin/icons";
import { LeadCreateForm } from "@/components/admin/lead-create-form";

export const metadata: Metadata = { title: "New lead" };

/**
 * Manual lead entry (Sales): record enquiries that arrive by email, WhatsApp,
 * phone or walk-in so they flow through the same CRM pipeline as website leads.
 */
export default async function NewLeadPage() {
  const actor = await requireActor();
  if (!can(actor.role, "leads", "create")) return <NoAccess />;

  // Bookable tours only, labelled by their English source title.
  const tours = (
    await prisma.tour.findMany({
      where: { status: "ACTIVE", archivedAt: null },
      select: { id: true, translations: { where: { locale: "en" }, select: { title: true } } },
    })
  )
    .map((t) => ({ id: t.id, title: t.translations[0]?.title ?? "Untitled tour" }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <Link
        href="/en/dashboard/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
      >
        <IconBack width={16} height={16} /> Leads
      </Link>
      <h2 className="mb-1 font-serif text-2xl font-semibold text-ink">New lead</h2>
      <p className="mb-5 text-sm text-muted">
        For enquiries that arrive outside the website — the lead behaves exactly like a website
        submission, with the source recorded.
      </p>
      <LeadCreateForm tours={tours} />
    </div>
  );
}
