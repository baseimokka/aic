import type { LeadStatus, PaymentStatus } from "@prisma/client";

/** Human labels shared by pills, selects, audit summaries and notifications. */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  NEGOTIATING: "Negotiating",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  DEPOSIT_PAID: "Deposit paid", // legacy only — no longer selectable
  PAID_IN_FULL: "Paid",
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[];
/** Deposit tracking was removed — the UI only offers these two. */
export const SELECTABLE_PAYMENT_STATUSES = ["UNPAID", "PAID_IN_FULL"] as const;

/**
 * Where a lead came from. Website submissions record the machine values on the
 * left; the rest are the channels sales admins pick during manual entry.
 */
export const LEAD_SOURCE_LABELS: Record<string, string> = {
  "booking-request": "Website · booking form",
  "tailor-made": "Website · tailor-made",
  contact: "Website · contact form",
  website: "Website",
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
  "walk-in": "Walk-in",
  other: "Other",
};

/** Channels offered on the manual "New lead" form (order = display order). */
export const MANUAL_LEAD_SOURCES = ["website", "whatsapp", "email", "phone", "walk-in", "other"] as const;

export function leadSourceLabel(source: string | null): string {
  if (!source) return "—";
  return LEAD_SOURCE_LABELS[source] ?? source;
}
