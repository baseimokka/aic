import { prisma } from "@/lib/db/client";
import type { AuditActionType, Prisma } from "@prisma/client";

export interface AuditInput {
  actorId?: string | null;
  actionType: AuditActionType;
  resourceType: string;
  resourceId: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * The single audit path (CLAUDE.md §13). Call from every admin mutation
 * AFTER the write succeeds. Bounded scope: create / update / delete /
 * status change / assignment change — never reads, views, or searches.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}
