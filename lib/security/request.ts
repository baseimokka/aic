import type { NextRequest } from "next/server";

/** Anonymous session cookie used to bind the bot challenge. */
export const SESSION_COOKIE = "aic_sid";

/**
 * Number of trusted reverse proxies in front of the app. The last `hops`
 * entries of `X-Forwarded-For` are appended by our own infrastructure and are
 * therefore trustworthy; everything to their left is client-supplied and MUST
 * NOT be trusted. Default 1 matches the documented deployment (single nginx in
 * front of the app). Set to 0 only when the app is directly exposed.
 */
const TRUSTED_PROXY_HOPS = (() => {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isInteger(raw) && raw >= 0 ? raw : 1;
})();

/**
 * The real client IP, resolved from trusted proxy hops (not the spoofable
 * leftmost X-Forwarded-For value). With `hops` trusted proxies each appending
 * the address they received the connection from, the client sits at index
 * `length - hops`; anything further left is attacker-controlled and ignored.
 *
 * When no trusted header is available we fail closed to a single shared
 * bucket ("unknown") rather than trusting a value the client can forge — a
 * request without a real proxy in front can't be attributed to a caller.
 */
export function clientIp(req: NextRequest): string {
  return clientIpFromHeaders(req.headers);
}

/**
 * Same trusted-hops resolution for contexts that only have a `Headers` object
 * (Server Actions via `next/headers`) — one source of truth with `clientIp`.
 */
export function clientIpFromHeaders(headers: Headers): string {
  if (TRUSTED_PROXY_HOPS > 0) {
    const fwd = headers.get("x-forwarded-for");
    if (fwd) {
      const parts = fwd
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const idx = parts.length - TRUSTED_PROXY_HOPS;
      if (idx >= 0 && parts[idx]) return parts[idx];
    }
  }
  return "unknown";
}

/**
 * Rate-limit key (Gap Closure §5). IP only — never mix in client-controlled
 * values such as the session cookie, or the limit can be reset by rotating
 * them.
 */
export function rateLimitKey(req: NextRequest): string {
  return clientIp(req);
}

/**
 * Candidate keys a challenge token may be bound to, in match order.
 * Issuance binds to the session cookie when one exists, else to the IP
 * (see /api/challenge); trying both here keeps every visitor path valid:
 * returning (sid), first-time (issued on IP before the cookie stuck), and
 * cookie-less (IP end-to-end).
 */
export function challengeKeys(req: NextRequest): string[] {
  const sid = req.cookies.get(SESSION_COOKIE)?.value;
  const ip = clientIp(req);
  return sid ? [sid, ip] : [ip];
}
