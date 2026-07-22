import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDate, formatDateTime } from "@/lib/utils";
import { resolvePricing } from "@/lib/pricing";
import { leadReference } from "@/lib/leads/reference";
import { leadSourceLabel } from "@/lib/leads/labels";
import { localeNames, type Locale } from "@/lib/i18n/config";
import { NoAccess } from "@/components/admin/no-access";
import { LeadStatusPill } from "@/components/admin/pills";
import { LeadStatusCard } from "@/components/admin/lead-status-card";
import { LeadFinancials } from "@/components/admin/lead-financials";
import { LeadArchiveControls } from "@/components/admin/lead-archive-controls";
import { IconArchive, IconBack, IconWhatsApp } from "@/components/admin/icons";
import { addLeadCommunication, addLeadNote } from "../actions";

export const metadata: Metadata = { title: "Lead details" };

const TIMELINE_STATUS_DOTS: Record<LeadStatus, string> = {
  NEW: "#2f6db0",
  CONTACTED: "#c98a16",
  NEGOTIATING: "#d94e20",
  CONFIRMED: "#1f8a5b",
  CANCELLED: "#6e6a80",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
  meeting: "Meeting",
  note: "Note",
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "leads", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "leads", "edit");
  const canArchive = can(actor.role, "leads", "delete");
  const { id } = await params;

  const [lead, staff, timeline] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        tour: {
          select: {
            slug: true,
            durationDays: true,
            basePrice: true,
            discountType: true,
            discountValue: true,
            discountStartsAt: true,
            discountEndsAt: true,
            currency: true,
            translations: { where: { locale: "en" }, select: { title: true } },
          },
        },
        assignedStaff: { select: { id: true, name: true, email: true, role: true } },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true, email: true } } },
        },
        communications: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true, email: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "SALES_ADMIN"] }, archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { resourceType: "Lead", resourceId: id },
          {
            resourceType: { in: ["LeadNote", "LeadCommunication"] },
            metadata: { path: ["leadId"], equals: id },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        actionType: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);
  if (!lead) notFound();

  const reference = leadReference(lead.id, lead.createdAt);
  const tourTitle = lead.tour?.translations[0]?.title ?? null;
  const phoneDigits = lead.phone.replace(/\D/g, "");
  const travelers =
    `${lead.adults} adult${lead.adults === 1 ? "" : "s"}` +
    (lead.children > 0 ? ` · ${lead.children} child${lead.children === 1 ? "" : "ren"}` : "");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/en/dashboard/leads"
          className="inline-flex h-11 items-center gap-1.5 rounded-[9px] border-[1.5px] border-line-input bg-white px-3.5 text-[13px] font-semibold text-ink-soft hover:bg-cream"
        >
          <IconBack width={15} height={15} />
          Leads
        </Link>
        <h2 className="font-serif text-[22px] font-medium text-ink">{lead.fullName}</h2>
        <LeadStatusPill status={lead.status} />
        <span className="text-xs text-faint">{reference}</span>
        <div className="ms-auto flex flex-wrap items-center gap-2.5">
          {phoneDigits.length >= 6 ? (
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-[9px] bg-whatsapp px-4 text-[13px] font-bold text-white hover:brightness-95"
            >
              <IconWhatsApp />
              WhatsApp
            </a>
          ) : null}
          {canArchive ? (
            <LeadArchiveControls leadId={lead.id} archived={Boolean(lead.archivedAt)} leadName={lead.fullName} />
          ) : null}
        </div>
      </div>

      {lead.archivedAt ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[11px] border border-[#f0deb0] bg-warning-soft px-4 py-3 text-[13px] font-semibold text-[#9a5a00]">
          <IconArchive width={16} height={16} />
          This lead is archived — it is hidden from the pipeline but fully restorable.
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_330px]">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Customer information
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Email">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="hover:text-accent-deep">
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Phone">{lead.phone || "—"}</Field>
              <Field label="Country">{lead.country || "—"}</Field>
              <Field label="Language">{localeNames[lead.locale as Locale]?.english ?? lead.locale}</Field>
              <Field label="Source">{leadSourceLabel(lead.source)}</Field>
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              {lead.source === "contact" ? "Contact enquiry" : "Booking request"}
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Tour">
                {lead.tour ? (
                  <Link href={`/en/tours/${lead.tour.slug}`} className="hover:text-accent-deep">
                    {tourTitle}
                  </Link>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Travelers">{lead.source === "contact" ? "—" : travelers}</Field>
              <Field label="Preferred date">
                {lead.preferredDate ? formatDate(lead.preferredDate) : "—"}
              </Field>
              {lead.hotelName ? <Field label="Hotel">{lead.hotelName}</Field> : null}
              {lead.roomNumber ? <Field label="Room">{lead.roomNumber}</Field> : null}
              {lead.specialRequests ? (
                <div className="sm:col-span-3">
                  <dt className="text-xs text-muted">
                    {lead.source === "contact" ? "Message" : "Special requests"}
                  </dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-ink-soft">{lead.specialRequests}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <LeadFinancials
            leadId={lead.id}
            canEdit={canEdit && !lead.archivedAt}
            initial={{
              // Prices derive from the chosen tour: effective (discounted)
              // per-person price × travelers.
              pricePerPerson: lead.tour
                ? resolvePricing({
                    basePrice: Number(lead.tour.basePrice),
                    discountType: lead.tour.discountType,
                    discountValue: lead.tour.discountValue == null ? null : Number(lead.tour.discountValue),
                    discountStartsAt: lead.tour.discountStartsAt,
                    discountEndsAt: lead.tour.discountEndsAt,
                  }).effectivePrice
                : null,
              currency: lead.tour?.currency ?? lead.currency,
              travelers: lead.adults + lead.children,
              paymentStatus: lead.paymentStatus,
            }}
          />

          <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Internal notes
            </h3>
            <div className="flex flex-col gap-2.5">
              {lead.notes.length === 0 ? (
                <p className="text-sm text-muted">No notes yet.</p>
              ) : (
                lead.notes.map((note) => (
                  <div key={note.id} className="rounded-[10px] border border-line-soft bg-cream px-3.5 py-3">
                    <p className="text-[13px] leading-relaxed text-ink-soft">{note.body}</p>
                    <p className="mt-1.5 text-[11px] text-faint">
                      {note.author?.name ?? note.author?.email ?? "Staff"} · {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            {canEdit && !lead.archivedAt ? (
              <form
                key={lead.notes.length}
                action={addLeadNote.bind(null, lead.id)}
                className="mt-3 flex gap-2"
              >
                <label htmlFor="lead-note" className="sr-only">
                  Add a note
                </label>
                <input
                  id="lead-note"
                  name="body"
                  required
                  maxLength={4000}
                  placeholder="Add a note…"
                  className="h-11 min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line-input bg-white px-3 text-[13px] text-ink outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
                >
                  Add
                </button>
              </form>
            ) : null}
          </section>

          <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Communication history
            </h3>
            <div className="flex flex-col gap-2.5">
              {lead.communications.length === 0 ? (
                <p className="text-sm text-muted">No contact logged yet.</p>
              ) : (
                lead.communications.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-3 rounded-[10px] border border-line-soft px-3.5 py-3">
                    <span className="mt-0.5 inline-flex rounded-md bg-teal-soft px-2 py-0.5 text-[11px] font-bold text-teal">
                      {CHANNEL_LABELS[comm.channel] ?? comm.channel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-relaxed text-ink-soft">{comm.summary}</p>
                      <p className="mt-1 text-[11px] text-faint">
                        {comm.author?.name ?? comm.author?.email ?? "Staff"} · {formatDateTime(comm.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {canEdit && !lead.archivedAt ? (
              <form
                key={lead.communications.length}
                action={addLeadCommunication.bind(null, lead.id)}
                className="mt-3 flex flex-wrap gap-2"
              >
                <label htmlFor="comm-channel" className="sr-only">
                  Channel
                </label>
                <select
                  id="comm-channel"
                  name="channel"
                  defaultValue="whatsapp"
                  className="h-11 rounded-[9px] border-[1.5px] border-line-input bg-white px-2.5 text-[13px] font-semibold text-ink outline-none focus:border-accent"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="meeting">Meeting</option>
                </select>
                <label htmlFor="comm-summary" className="sr-only">
                  What was discussed
                </label>
                <input
                  id="comm-summary"
                  name="summary"
                  required
                  maxLength={2000}
                  placeholder="What was discussed…"
                  className="h-11 min-w-0 flex-1 rounded-[9px] border-[1.5px] border-line-input bg-white px-3 text-[13px] text-ink outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 items-center rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
                >
                  Log
                </button>
              </form>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <LeadStatusCard
            leadId={lead.id}
            status={lead.status}
            assignedStaffId={lead.assignedStaff?.id ?? null}
            canEdit={canEdit && !lead.archivedAt}
            staff={staff.map((s) => ({ id: s.id, name: s.name ?? s.email, role: s.role }))}
          />

          <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Activity timeline
            </h3>
            <div className="flex flex-col">
              {timeline.map((entry) => (
                <TimelineRow
                  key={entry.id}
                  dot={dotFor(entry.actionType, entry.metadata)}
                  title={summaryOf(entry.metadata) ?? entry.actionType}
                  meta={`${entry.actor?.name ?? entry.actor?.email ?? "System"} · ${formatDateTime(entry.createdAt)}`}
                />
              ))}
              <TimelineRow
                dot="#2f6db0"
                title={`Lead created · ${leadSourceLabel(lead.source)}`}
                meta={`System · ${formatDateTime(lead.createdAt)}`}
                last
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{children}</dd>
    </div>
  );
}

function TimelineRow({
  dot,
  title,
  meta,
  last = false,
}: {
  dot: string;
  title: string;
  meta: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span aria-hidden className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: dot }} />
        {!last ? <span aria-hidden className="w-0.5 flex-1 bg-line-soft" /> : null}
      </div>
      <div className={last ? "" : "pb-4"}>
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        <div className="text-xs text-faint">{meta}</div>
      </div>
    </div>
  );
}

function summaryOf(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "summary" in metadata) {
    const summary = (metadata as { summary?: unknown }).summary;
    if (typeof summary === "string" && summary) return summary;
  }
  return null;
}

function dotFor(actionType: string, metadata: unknown): string {
  if (actionType === "STATUS_CHANGE" && metadata && typeof metadata === "object" && "to" in metadata) {
    const to = (metadata as { to?: string }).to;
    if (to && to in TIMELINE_STATUS_DOTS) return TIMELINE_STATUS_DOTS[to as LeadStatus];
  }
  switch (actionType) {
    case "ASSIGNMENT_CHANGE":
      return "#0e7a72";
    case "CREATE":
      return "#6c4ba6";
    case "DELETE":
      return "#b3261e";
    case "UPDATE":
      return "#c98a16";
    default:
      return "#2f6db0";
  }
}
