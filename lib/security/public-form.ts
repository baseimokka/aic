import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "./rate-limit";
import { rateLimitKey } from "./request";

/** True when the hidden honeypot field ("company") was filled — i.e. a bot. */
export function honeypotTripped(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const company = (body as { company?: unknown }).company;
  return typeof company === "string" && company.length > 0;
}

/**
 * Shared submission budget across the booking and contact endpoints
 * (Gap Closure §5). Returns the 429 to send, or null when within budget.
 * The client mirrors Retry-After as a live countdown.
 */
export function throttleResponse(req: NextRequest): NextResponse | null {
  const result = checkRateLimit(`public-forms:${rateLimitKey(req)}`);
  if (result.ok) return null;
  return NextResponse.json(
    { ok: false, error: "rate_limited", retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}
