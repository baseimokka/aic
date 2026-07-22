import { z } from "zod";
import { roles } from "@/lib/rbac/matrix";

/**
 * Staff user schemas (Phase 7 — Users module, Super Admin only). Shared between
 * the client forms and the server actions. Passwords are never stored in plain
 * text; the action hashes with bcrypt before persisting.
 */

const roleSchema = z.enum(roles);

export const userCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  role: roleSchema,
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  role: roleSchema,
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const passwordResetSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters.").max(100),
});
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
