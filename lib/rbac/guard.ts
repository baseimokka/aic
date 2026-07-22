import { can, type Action, type Resource, type Role } from "./matrix";

/** The authenticated actor as resolved from the session — never from client input. */
export interface Actor {
  id: string;
  role: Role;
}

export class PermissionError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}

export class AuthRequiredError extends Error {
  readonly status = 401;
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/**
 * Server-side authorization gate. Call FIRST in every Server Action / API route
 * that mutates or reads a protected resource (CLAUDE.md §4, §11).
 * Throws (401/403) when the actor is missing or lacks the permission.
 */
export function requirePermission(
  actor: Actor | null | undefined,
  resource: Resource,
  action: Action,
): asserts actor is Actor {
  if (!actor) throw new AuthRequiredError();
  if (!can(actor.role, resource, action)) {
    throw new PermissionError(`Role ${actor.role} cannot ${action} "${resource}".`);
  }
}
