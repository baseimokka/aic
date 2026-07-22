import { z } from "zod";
import { locales } from "@/lib/i18n/config";
import { isValidFutureDate } from "./booking";
import { requiredText, nullableText } from "./content";
import { currencySchema } from "./lead";

/**
 * Transfer module schemas — shared between the public form / API route and the
 * admin CRUD server actions (§10/§11). Mirrors the booking-request spine:
 * the server is the boundary; the client reuses the same schema for UX only.
 */

export const transferRequestStatusSchema = z.enum(["NEW", "CONTACTED", "CONFIRMED", "CANCELLED"]);

// ─────────────────────────── Public transfer request ───────────────────────────
/** `company` is the honeypot: a real user never fills it, so it must be empty. */
export const transferRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(40),
  pickupDate: z
    .string()
    .min(1, "Choose a pickup date.")
    .refine(isValidFutureDate, "Choose a valid pickup date, today or later."),
  passengers: z.coerce.number().int().min(1, "At least one passenger.").max(200),
  vehicleId: z.string().trim().min(1, "Choose a vehicle.").max(40),
  fromLocationId: z.string().trim().min(1, "Choose a pickup location.").max(40),
  toLocationId: z.string().trim().min(1, "Choose a drop-off location.").max(40),
  notes: z.string().trim().max(2000).optional(),
  consent: z.boolean().refine((v) => v === true, "Consent is required."),
  // locale the form was submitted from — recorded for follow-up context
  locale: z.enum(locales).optional(),
  // "I'm not a robot" token from /api/challenge (Gap Closure §4)
  challengeToken: z.string().min(1, "Please confirm you're not a robot."),
  // honeypot — must stay empty
  company: z.string().max(0).optional(),
}).superRefine((v, ctx) => {
  if (v.fromLocationId && v.fromLocationId === v.toLocationId) {
    ctx.addIssue({ code: "custom", path: ["toLocationId"], message: "Pickup and drop-off must be different." });
  }
});
export type TransferRequestInput = z.infer<typeof transferRequestSchema>;

// ─────────────────────────── Admin: vehicle ───────────────────────────
export const transferVehicleSchema = z.object({
  name: requiredText("Name", 120),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1.").max(200),
  active: z.boolean().default(true),
});
export type TransferVehicleInput = z.infer<typeof transferVehicleSchema>;

// ─────────────────────────── Admin: location ───────────────────────────
export const transferLocationSchema = z.object({
  name: requiredText("Name", 120),
  active: z.boolean().default(true),
});
export type TransferLocationInput = z.infer<typeof transferLocationSchema>;

// ─────────────────────────── Admin: route price ───────────────────────────
/** `vehicleId = null` prices the route for any vehicle (vehicle-specific rows override). */
export const transferRouteSchema = z.object({
  fromLocationId: z.string().trim().min(1, "Choose a pickup location.").max(40),
  toLocationId: z.string().trim().min(1, "Choose a destination.").max(40),
  vehicleId: nullableText(40),
  price: z.coerce.number().min(0, "Price can't be negative.").max(99_999_999),
  currency: currencySchema.default("USD"),
}).superRefine((v, ctx) => {
  if (v.fromLocationId && v.fromLocationId === v.toLocationId) {
    ctx.addIssue({ code: "custom", path: ["toLocationId"], message: "Pickup and destination must be different." });
  }
});
export type TransferRouteInput = z.infer<typeof transferRouteSchema>;
