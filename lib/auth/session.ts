import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import type { Actor } from "@/lib/rbac/guard";

/**
 * Resolve the current actor from the Auth.js session. Server Actions call this
 * and pass the result to requirePermission(). Authorization is ALWAYS derived
 * from the session, never from client input (§11).
 *
 * The role is re-read from the database (not trusted from the JWT) so that
 * archiving a user or changing their role takes effect immediately, not at
 * next sign-in. cache() dedupes the lookup within one request.
 */
export const getCurrentActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, archivedAt: true },
  });
  if (!user || user.archivedAt) return null;

  return { id, role: user.role };
});
