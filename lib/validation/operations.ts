import { z } from "zod";
import { requiredText, nullableText } from "./content";

/**
 * Zod schemas for the Operations Admin's toolkit (Phase 6 — CLAUDE.md §6/§9):
 * guides, vehicles, and the guide + vehicle + scheduling assignment made to a
 * confirmed booking. Shared between the client forms and the server actions.
 */

// ─────────────────────────── Guide ───────────────────────────
export const guideSchema = z.object({
  name: requiredText("Name", 120),
  languages: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  contact: nullableText(200),
  availabilityStatus: z.enum(["AVAILABLE", "BUSY", "UNAVAILABLE"]).default("AVAILABLE"),
});
export type GuideInput = z.infer<typeof guideSchema>;

// ─────────────────────────── Vehicle ───────────────────────────
export const vehicleSchema = z.object({
  name: requiredText("Name", 120),
  type: requiredText("Type", 80),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1.").max(200),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]).default("ACTIVE"),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

// ─────────────────────────── Assignment (guide + vehicle → confirmed booking) ───────────────────────────
// leadId comes from the route, never the payload — never trust a client id for the target (§11).
export const assignmentSchema = z.object({
  guideId: nullableText(40),
  vehicleId: nullableText(40),
  /** "YYYY-MM-DD" from the date picker; parsed + validated to a Date in the action. */
  scheduledDate: nullableText(40),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;
