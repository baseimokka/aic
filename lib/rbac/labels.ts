import type { Role } from "./matrix";
import { roles } from "./matrix";

/** Human labels + one-line descriptions for the four fixed roles (CLAUDE.md §4). */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SALES_ADMIN: "Sales Admin",
  CONTENT_ADMIN: "Content Admin",
  OPERATIONS_ADMIN: "Operations Admin",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Full access to every module, including users and settings.",
  SALES_ADMIN: "Owns the Lead CRM and can view tours.",
  CONTENT_ADMIN: "Manages tours, content, media, SEO and translations.",
  OPERATIONS_ADMIN: "Manages guides, vehicles and booking assignments.",
};

/** Ordered role options for selects (Super Admin first). */
export const ROLE_OPTIONS: Role[] = [...roles];
