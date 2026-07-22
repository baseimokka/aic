/**
 * RBAC permission matrix — the single source of truth (CLAUDE.md §4, PRD §18).
 * Both the server guard (requirePermission) and UI gating derive from this.
 * "delete" is interpreted as ARCHIVE everywhere — no hard delete (Gap Closure Addendum §6).
 */
export const roles = ["SUPER_ADMIN", "SALES_ADMIN", "CONTENT_ADMIN", "OPERATIONS_ADMIN"] as const;
export type Role = (typeof roles)[number];

export const actions = ["view", "create", "edit", "delete"] as const;
export type Action = (typeof actions)[number];

export const resources = [
  "tours",
  "categories",
  "destinations",
  "testimonials",
  "reviews",
  "faqs",
  "homepage",
  "heroBanners",
  "blog",
  "leads",
  "transferRequests",
  "transferConfig",
  "guides",
  "vehicles",
  "assignments",
  "assignmentRules",
  "users",
  "media",
  "seo",
  "analytics",
  "auditLogs",
  "settings",
  "notifications",
  "translations",
] as const;
export type Resource = (typeof resources)[number];

const ALL: Action[] = ["view", "create", "edit", "delete"];
const V: Action[] = ["view"];

export const MATRIX: Record<Role, Partial<Record<Resource, Action[]>>> = {
  SUPER_ADMIN: {
    tours: ALL, categories: ALL, destinations: ALL, testimonials: ALL, reviews: ALL, faqs: ALL,
    homepage: ALL, heroBanners: ALL, blog: ALL, leads: ALL, guides: ALL, vehicles: ALL,
    transferRequests: ALL, transferConfig: ALL,
    assignments: ALL, assignmentRules: ALL, users: ALL, media: ALL, seo: ALL,
    analytics: V, auditLogs: V, settings: ALL, notifications: V, translations: ALL,
  },
  SALES_ADMIN: {
    tours: V,
    reviews: V, // sales sees what customers say, content owns the copy
    leads: ALL,
    // Transfers are a sales channel: sales owns the request inbox and the
    // vehicles / locations / pricing configuration behind the public form.
    transferRequests: ALL,
    transferConfig: ALL,
    analytics: V,
    notifications: V,
  },
  CONTENT_ADMIN: {
    tours: ALL, categories: ALL, destinations: ALL, testimonials: ALL, reviews: ALL, faqs: ALL,
    homepage: ALL, heroBanners: ALL, blog: ALL, media: ALL, seo: ALL,
    translations: ALL, analytics: V, notifications: V,
  },
  OPERATIONS_ADMIN: {
    tours: V,
    leads: V,
    guides: ALL, vehicles: ALL, assignments: ALL,
    media: V, analytics: V, notifications: V,
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}
