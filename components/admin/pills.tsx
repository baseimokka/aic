import type { AuditActionType, GuideAvailability, LeadStatus, PaymentStatus, TransferRequestStatus, VehicleStatus } from "@prisma/client";
import { LEAD_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/leads/labels";
import { GUIDE_AVAILABILITY_LABELS, VEHICLE_STATUS_LABELS } from "@/lib/operations/labels";
import { TRANSFER_STATUS_LABELS } from "@/lib/transfers/labels";

/**
 * Status pills — colour is never the sole signal (each pill carries its
 * label); text tints are the deepened variants for AA contrast on the
 * soft backgrounds (design system semantic scale).
 */

const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-[#eaf1f9] text-[#2f6db0] border-[#cadef1]",
  CONTACTED: "bg-[#fbf2de] text-[#9a5a00] border-[#f0deb0]",
  NEGOTIATING: "bg-[#fcebe2] text-[#c0511f] border-[#f6cdb8]",
  CONFIRMED: "bg-[#e4f3eb] text-[#0f6b43] border-[#bfe3ce]",
  CANCELLED: "bg-surface-2 text-ink-soft border-line-input",
};

export function LeadStatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${LEAD_STATUS_STYLES[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, { className: string; dot: string }> = {
  UNPAID: { className: "bg-[#fbeae8] text-[#b3261e] border-[#f3c9c4]", dot: "#b3261e" },
  DEPOSIT_PAID: { className: "bg-[#fbf2de] text-[#9a5a00] border-[#f0deb0]", dot: "#c98a16" },
  PAID_IN_FULL: { className: "bg-[#e4f3eb] text-[#0f6b43] border-[#bfe3ce]", dot: "#1f8a5b" },
};

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const s = { label: PAYMENT_STATUS_LABELS[status], ...PAYMENT_STATUS_STYLES[status] };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${s.className}`}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.dot }} aria-hidden />
      {s.label}
    </span>
  );
}

/** Transfer request pipeline (Transfer module) — same tint scale as leads. */
const TRANSFER_STATUS_STYLES: Record<TransferRequestStatus, string> = {
  NEW: "bg-[#eaf1f9] text-[#2f6db0] border-[#cadef1]",
  CONTACTED: "bg-[#fbf2de] text-[#9a5a00] border-[#f0deb0]",
  CONFIRMED: "bg-[#e4f3eb] text-[#0f6b43] border-[#bfe3ce]",
  CANCELLED: "bg-surface-2 text-ink-soft border-line-input",
};

export function TransferStatusPill({ status }: { status: TransferRequestStatus }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${TRANSFER_STATUS_STYLES[status]}`}
    >
      {TRANSFER_STATUS_LABELS[status]}
    </span>
  );
}

/** Guide availability (Operations, Phase 6) — colour carries a redundant dot + label for AA. */
const GUIDE_AVAILABILITY_STYLES: Record<GuideAvailability, { className: string; dot: string }> = {
  AVAILABLE: { className: "bg-[#e4f3eb] text-[#0f6b43] border-[#bfe3ce]", dot: "#1f8a5b" },
  BUSY: { className: "bg-[#fbf2de] text-[#9a5a00] border-[#f0deb0]", dot: "#c98a16" },
  UNAVAILABLE: { className: "bg-surface-2 text-ink-soft border-line-input", dot: "#6e6a80" },
};

export function GuideAvailabilityPill({ status }: { status: GuideAvailability }) {
  const s = GUIDE_AVAILABILITY_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${s.className}`}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.dot }} aria-hidden />
      {GUIDE_AVAILABILITY_LABELS[status]}
    </span>
  );
}

/** Vehicle operational status (Operations, Phase 6). */
const VEHICLE_STATUS_STYLES: Record<VehicleStatus, { className: string; dot: string }> = {
  ACTIVE: { className: "bg-[#e4f3eb] text-[#0f6b43] border-[#bfe3ce]", dot: "#1f8a5b" },
  MAINTENANCE: { className: "bg-[#fbf2de] text-[#9a5a00] border-[#f0deb0]", dot: "#c98a16" },
  INACTIVE: { className: "bg-surface-2 text-ink-soft border-line-input", dot: "#6e6a80" },
};

export function VehicleStatusPill({ status }: { status: VehicleStatus }) {
  const s = VEHICLE_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${s.className}`}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: s.dot }} aria-hidden />
      {VEHICLE_STATUS_LABELS[status]}
    </span>
  );
}

/** Boolean Active / Inactive pill (transfer vehicles & locations) — label + dot for AA. */
export function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${
        active
          ? "border-[#bfe3ce] bg-[#e4f3eb] text-[#0f6b43]"
          : "border-line-input bg-surface-2 text-ink-soft"
      }`}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: active ? "#1f8a5b" : "#6e6a80" }} aria-hidden />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/** Delete is archive everywhere (Addendum §6), so the pill says so. */
const AUDIT_ACTION: Record<AuditActionType, { label: string; className: string }> = {
  CREATE: { label: "Create", className: "bg-[#eaf1f9] text-[#2f6db0]" },
  UPDATE: { label: "Update", className: "bg-purple-soft text-purple" },
  DELETE: { label: "Archive", className: "bg-[#fbeae8] text-[#b3261e]" },
  STATUS_CHANGE: { label: "Status change", className: "bg-[#e4f3eb] text-[#0f6b43]" },
  ASSIGNMENT_CHANGE: { label: "Assignment", className: "bg-[#fbf2de] text-[#9a5a00]" },
};

export function AuditActionPill({ action }: { action: AuditActionType }) {
  const a = AUDIT_ACTION[action];
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${a.className}`}>
      {a.label}
    </span>
  );
}
