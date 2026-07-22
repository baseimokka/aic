import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/session";
import type { Actor } from "@/lib/rbac/guard";

/**
 * Page-level gate for the admin console: unauthenticated visitors go to the
 * login screen. Per-module visibility is checked with can() in each page;
 * mutations are separately guarded by requirePermission() in every action.
 */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/en/login");
  return actor;
}
