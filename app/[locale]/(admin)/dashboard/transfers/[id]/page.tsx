import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireActor } from "@/lib/auth/require";
import { can } from "@/lib/rbac/matrix";
import { formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { transferReference } from "@/lib/transfers/reference";
import { resolveTransferPrice } from "@/lib/transfers/pricing";
import { localeNames, type Locale } from "@/lib/i18n/config";
import { NoAccess } from "@/components/admin/no-access";
import { TransferStatusPill } from "@/components/admin/pills";
import { TransferStatusCard } from "@/components/admin/transfer-status-card";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { IconArchive, IconBack, IconWhatsApp } from "@/components/admin/icons";
import { archiveTransferRequest, restoreTransferRequest } from "../actions";

export const metadata: Metadata = { title: "Transfer request" };

export default async function TransferRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (!can(actor.role, "transferRequests", "view")) return <NoAccess />;
  const canEdit = can(actor.role, "transferRequests", "edit");
  const canArchive = can(actor.role, "transferRequests", "delete");
  const { id } = await params;

  const request = await prisma.transferRequest.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, name: true, capacity: true } },
      fromLocation: { select: { id: true, name: true } },
      toLocation: { select: { id: true, name: true } },
    },
  });
  if (!request) notFound();

  // Current configured price alongside the snapshot — pricing may have moved on.
  const currentRate = await resolveTransferPrice(
    request.fromLocation.id,
    request.toLocation.id,
    request.vehicle.id,
  );

  const reference = transferReference(request.id, request.createdAt);
  const phoneDigits = request.phone.replace(/\D/g, "");
  const quoted =
    request.quotedPrice !== null ? formatMoney(Number(request.quotedPrice), request.currency) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/en/dashboard/transfers"
          className="inline-flex h-11 items-center gap-1.5 rounded-[9px] border-[1.5px] border-line-input bg-white px-3.5 text-[13px] font-semibold text-ink-soft hover:bg-cream"
        >
          <IconBack width={15} height={15} />
          Transfer requests
        </Link>
        <h2 className="font-serif text-[22px] font-medium text-ink">{request.fullName}</h2>
        <TransferStatusPill status={request.status} />
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
            <ArchiveDialog
              id={request.id}
              archived={Boolean(request.archivedAt)}
              name={reference}
              entityLabel="transfer request"
              archiveAction={archiveTransferRequest}
              restoreAction={restoreTransferRequest}
            />
          ) : null}
        </div>
      </div>

      {request.archivedAt ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[11px] border border-[#f0deb0] bg-warning-soft px-4 py-3 text-[13px] font-semibold text-[#9a5a00]">
          <IconArchive width={16} height={16} />
          This transfer request is archived — it is hidden from the list but fully restorable.
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
                <a href={`mailto:${request.email}`} className="hover:text-accent-deep">
                  {request.email}
                </a>
              </Field>
              <Field label="Phone">{request.phone || "—"}</Field>
              <Field label="Language">{localeNames[request.locale as Locale]?.english ?? request.locale}</Field>
              <Field label="Submitted">{formatDateTime(request.createdAt)}</Field>
            </dl>
          </section>

          <section className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
            <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Transfer details
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Route">
                {request.fromLocation.name} → {request.toLocation.name}
              </Field>
              <Field label="Vehicle">
                {request.vehicle.name} · {request.vehicle.capacity} seats
              </Field>
              <Field label="Passengers">{request.passengers}</Field>
              <Field label="Pickup date">{formatDate(request.pickupDate)}</Field>
              <Field label="Quoted price">{quoted ?? "On request"}</Field>
              <Field label="Current configured price">
                {currentRate ? formatMoney(currentRate.price, currentRate.currency) : "Not configured"}
              </Field>
              {request.notes ? (
                <div className="sm:col-span-3">
                  <dt className="text-xs text-muted">Notes</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-ink-soft">{request.notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        <TransferStatusCard
          requestId={request.id}
          status={request.status}
          canEdit={canEdit && !request.archivedAt}
        />
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
