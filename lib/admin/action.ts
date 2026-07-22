import { PermissionError, AuthRequiredError } from "@/lib/rbac/guard";

/**
 * Shared shape for client-invoked admin mutations (mirrors the P3 CRM spine).
 * Every content action returns this so client forms can branch uniformly.
 * `id` is returned on create so the UI can redirect to the new record.
 */
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Turn a thrown error into the failure branch, surfacing auth/permission
 * messages. Typed narrowly so actions with a richer success payload (e.g. one
 * returning a media record) can reuse it without widening their return type.
 */
export function failError(scope: string, err: unknown): { ok: false; error: string } {
  if (err instanceof PermissionError || err instanceof AuthRequiredError) {
    return { ok: false, error: err.message };
  }
  console.error(`[${scope}] action failed:`, err);
  return { ok: false, error: "Something went wrong — please try again." };
}

/** Turn a thrown error into an ActionResult, surfacing auth/permission messages. */
export function fail(scope: string, err: unknown): ActionResult {
  return failError(scope, err);
}
