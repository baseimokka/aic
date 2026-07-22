import { z } from "zod";
import { locales } from "@/lib/i18n/config";

/**
 * A preferred travel date, when supplied, must be a real calendar date in
 * `YYYY-MM-DD` form (the value an <input type="date"> produces) and not in the
 * past. Empty / absent is allowed — the field is optional. Rejecting garbage
 * here stops the API from silently discarding an unparseable date.
 * A one-day grace absorbs timezone skew between the visitor and the server.
 */
export function isValidFutureDate(value: string | undefined): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.toISOString().slice(0, 10) !== value) return false; // rejects e.g. 2026-02-31
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return date.getTime() >= todayUtc - 24 * 60 * 60 * 1000;
}

/**
 * Booking request — the authoritative server-side schema (§26, shared with the client).
 * `company` is the honeypot: a real user never fills it, so it must be empty.
 */
export const bookingRequestSchema = z.object({
  // The tour's stable slug (not its DB id): prerendered pages carry it, and it
  // survives a reseed, so a booking can't be rejected just because ids rotated.
  tourSlug: z.string().trim().min(1).max(200).optional(),
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(40),
  country: z.string().trim().min(2).max(80),
  preferredDate: z
    .string()
    .optional()
    .refine(isValidFutureDate, "Choose a valid travel date, today or later."),
  adults: z.coerce.number().int().min(1, "At least one adult.").max(40),
  children: z.coerce.number().int().min(0).max(20).default(0),
  hotelName: z.string().trim().max(160).optional(),
  roomNumber: z.string().trim().max(30).optional(),
  specialRequests: z.string().trim().max(2000).optional(),
  // Distinguishes a tour booking from a tailor-made trip request. Mapped
  // server-side to Lead.source so the CRM can tell the two apart; structured
  // tailor-made preferences travel inside specialRequests (no schema change).
  requestType: z.enum(["tour", "tailor-made"]).default("tour"),
  consent: z.boolean().refine((v) => v === true, "Consent is required."),
  // locale the form was submitted from — feeds assignment-rule "language" matching
  locale: z.enum(locales).optional(),
  // "I'm not a robot" token from /api/challenge (Gap Closure §4)
  challengeToken: z.string().min(1, "Please confirm you're not a robot."),
  // honeypot — must stay empty
  company: z.string().max(0).optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
