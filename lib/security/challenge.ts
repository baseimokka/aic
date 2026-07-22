import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Provider-agnostic "I'm not a robot" challenge (Gap Closure §4).
 *
 * The built-in provider issues an HMAC-signed, session-bound, time-limited
 * token when the visitor ticks the checkbox (see /api/challenge) and verifies
 * it on submission. It stops non-JS form-POST bots; the honeypot and rate
 * limiter cover the rest. A hosted provider (Turnstile, hCaptcha) can be
 * added later by implementing `BotChallengeProvider` and switching
 * BOT_CHALLENGE_PROVIDER — the API routes only call `verifyChallenge`.
 */
export interface BotChallengeProvider {
  verify(token: string | undefined, sessionKey: string): boolean | Promise<boolean>;
}

const TOKEN_MAX_AGE_MS = 30 * 60 * 1000;
// Tolerate small clock skew if issue/verify ever land on different hosts.
const CLOCK_SKEW_MS = 60 * 1000;

let warnedInsecure = false;
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (!warnedInsecure) {
    warnedInsecure = true;
    console.warn("[challenge] AUTH_SECRET missing/short — using an insecure dev fallback.");
  }
  return "aic-dev-insecure-challenge-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function issueChallengeToken(sessionKey: string, now = Date.now()): string {
  const ts = String(now);
  return `${ts}.${sign(`${ts}.${sessionKey}`)}`;
}

export function verifyChallengeToken(token: string | undefined, sessionKey: string, now = Date.now()): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const ts = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const issuedAt = Number(ts);
  if (!Number.isFinite(issuedAt)) return false;
  if (now - issuedAt > TOKEN_MAX_AGE_MS || issuedAt - now > CLOCK_SKEW_MS) return false;
  const expected = Buffer.from(sign(`${ts}.${sessionKey}`));
  const actual = Buffer.from(mac);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const builtinProvider: BotChallengeProvider = { verify: verifyChallengeToken };

export function getChallengeProvider(): BotChallengeProvider {
  // Only the built-in provider ships in Phase 2; hosted providers plug in here.
  return builtinProvider;
}

/** The single verification entry point the public API routes call. */
export async function verifyChallenge(token: string | undefined, sessionKeys: string[]): Promise<boolean> {
  const provider = getChallengeProvider();
  for (const key of sessionKeys) {
    if (await provider.verify(token, key)) return true;
  }
  return false;
}
