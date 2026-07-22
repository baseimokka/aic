/**
 * Public-form rate limiting (Gap Closure §5): 5 submissions per 10 minutes
 * per IP+session, shared across the booking and contact endpoints.
 *
 * Sliding-window, in-memory. That suits the single-process VPS deployment
 * this platform targets; if the app ever runs multi-instance/serverless,
 * swap the Map for a shared store (Redis) behind this same function.
 */
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const PRUNE_EVERY = 500;

const hits = new Map<string, number[]>();
let callsSincePrune = 0;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  if (++callsSincePrune >= PRUNE_EVERY) {
    callsSincePrune = 0;
    for (const [k, stamps] of hits) {
      if (stamps.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    const retryAfterMs = recent[0] + WINDOW_MS - now;
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true };
}
