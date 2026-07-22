import { z } from "zod";
import { isValidFutureDate } from "./booking";

/** Admin CRM mutations — server-authoritative schemas (§11). */

export const leadStatusSchema = z.enum(["NEW", "CONTACTED", "NEGOTIATING", "CONFIRMED", "CANCELLED"]);
/** ISO 4217 code; the offered set is data (Settings.currencies), not a schema enum. */
export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code (e.g. USD).");
export const paymentStatusSchema = z.enum(["UNPAID", "DEPOSIT_PAID", "PAID_IN_FULL"]);
/** Deposit tracking was removed — only these two are user-selectable. */
export const selectablePaymentStatusSchema = z.enum(["UNPAID", "PAID_IN_FULL"]);

/**
 * Financials (Phase 1): trip price and total both derive from the chosen tour
 * (per-person price × travelers) and are read-only. The only editable piece is
 * the two-state paid/unpaid marker. No deposit, no manual price, no balance.
 */
export const leadFinancialsSchema = z.object({
  paymentStatus: selectablePaymentStatusSchema,
});
export type LeadFinancialsInput = z.infer<typeof leadFinancialsSchema>;

export const leadNoteSchema = z.object({
  body: z.string().trim().min(1, "Write a note first.").max(4000),
});

export const leadCommunicationSchema = z.object({
  channel: z.enum(["whatsapp", "email", "phone", "meeting"]),
  summary: z.string().trim().min(1, "Describe the conversation.").max(2000),
});

/** Channels a sales admin can record when entering a lead by hand. */
export const manualLeadSourceSchema = z.enum(["website", "whatsapp", "email", "phone", "walk-in", "other"]);
export type ManualLeadSource = z.infer<typeof manualLeadSourceSchema>;

/**
 * Manual lead entry (Sales — email/WhatsApp/phone/walk-in enquiries). Mirrors
 * the public booking-request shape so the created lead behaves exactly like a
 * website lead in the CRM; only `source` differs. Email is optional here —
 * a WhatsApp or phone contact may not have one.
 */
export const manualLeadSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter the customer's full name.").max(120),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().email("Enter a valid email address.").nullable(),
  ),
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(40),
  country: z.string().trim().min(2, "Enter the customer's country.").max(80),
  tourId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(40).nullable(),
  ),
  preferredDate: z
    .string()
    .optional()
    .refine(isValidFutureDate, "Choose a valid travel date, today or later."),
  adults: z.coerce.number().int().min(1, "At least one adult.").max(40),
  children: z.coerce.number().int().min(0).max(20).default(0),
  source: manualLeadSourceSchema,
  notes: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(4000).nullable(),
  ),
});
export type ManualLeadInput = z.infer<typeof manualLeadSchema>;
