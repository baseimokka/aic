import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDate } from "@/lib/utils";
import { GUIDE_AVAILABILITY_LABELS } from "@/lib/operations/labels";
import { NoAccess } from "@/components/admin/no-access";
import { LeadStatusPill } from "@/components/admin/pills";
import { AssignmentForm, type AssignmentOption } from "@/components/admin/assignment-form";
import { IconArchive, IconBack } from "@/components/admin/icons";

function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function ManageAssignmentPage({ params }: { params: Promise<{ leadId: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "assignments", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "assignments", "edit");

  const { leadId } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      tour: { select: { slug: true, translations: { where: { locale: "en" }, select: { title: true } } } },
      assignedStaff: { select: { name: true, email: true } },
      assignment: true,
    },
  });
  if (!lead) notFound();

  const active = lead.assignment && !lead.assignment.archivedAt ? lead.assignment : null;

  // Offer active guides/vehicles, plus whichever is currently assigned (even if archived).
  const [guideRows, vehicleRows] = await Promise.all([
    prisma.guide.findMany({
      where: { OR: [{ archivedAt: null }, ...(active?.guideId ? [{ id: active.guideId }] : [])] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, availabilityStatus: true, archivedAt: true },
    }),
    prisma.vehicle.findMany({
      where: { OR: [{ archivedAt: null }, ...(active?.vehicleId ? [{ id: active.vehicleId }] : [])] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true, capacity: true, archivedAt: true },
    }),
  ]);

  const guides: AssignmentOption[] = guideRows.map((g) => ({
    id: g.id,
    label:
      `${g.name} · ${GUIDE_AVAILABILITY_LABELS[g.availabilityStatus]}` + (g.archivedAt ? " (archived)" : ""),
  }));
  const vehicles: AssignmentOption[] = vehicleRows.map((veh) => ({
    id: veh.id,
    label: `${veh.name} · ${veh.type}, ${veh.capacity} seats` + (veh.archivedAt ? " (archived)" : ""),
  }));

  const tourTitle = lead.tour?.translations[0]?.title ?? "—";
  const travelers =
    `${lead.adults} adult${lead.adults === 1 ? "" : "s"}` +
    (lead.children > 0 ? ` · ${lead.children} child${lead.children === 1 ? "" : "ren"}` : "");
  const confirmed = lead.status === "CONFIRMED" && !lead.archivedAt;

  return (
    <div>
      <Link href="/en/dashboard/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <IconBack width={16} height={16} /> Assignments
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">{lead.fullName}</h2>
        <LeadStatusPill status={lead.status} />
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-5 lg:grid-cols-[300px_1fr]">
        <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
          <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Booking</h3>
          <dl className="space-y-3">
            <SummaryRow label="Tour">
              {lead.tour ? (
                <Link href={`/en/tours/${lead.tour.slug}`} className="hover:text-accent-deep">
                  {tourTitle}
                </Link>
              ) : (
                "—"
              )}
            </SummaryRow>
            <SummaryRow label="Travelers">{travelers}</SummaryRow>
            <SummaryRow label="Preferred date">
              {lead.preferredDate ? formatDate(lead.preferredDate) : "—"}
            </SummaryRow>
            <SummaryRow label="Country">{lead.country || "—"}</SummaryRow>
            <SummaryRow label="Sales owner">
              {lead.assignedStaff?.name ?? lead.assignedStaff?.email ?? "Unassigned"}
            </SummaryRow>
          </dl>
        </section>

        <div>
          {confirmed ? (
            <AssignmentForm
              leadId={lead.id}
              canEdit={canEdit}
              hasAssignment={Boolean(active)}
              guides={guides}
              vehicles={vehicles}
              initial={{
                guideId: active?.guideId ?? "",
                vehicleId: active?.vehicleId ?? "",
                scheduledDate: toDateInput(active?.scheduledDate ?? null),
              }}
            />
          ) : (
            <div className="flex items-center gap-2.5 rounded-[11px] border border-[#f0deb0] bg-warning-soft px-4 py-3 text-[13px] font-semibold text-[#9a5a00]">
              <IconArchive width={16} height={16} />
              Only confirmed bookings can be scheduled. This booking is {lead.archivedAt ? "archived" : `marked ${lead.status.toLowerCase()}`}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}
