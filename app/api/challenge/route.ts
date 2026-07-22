import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { issueChallengeToken } from "@/lib/security/challenge";
import { SESSION_COOKIE, clientIp } from "@/lib/security/request";

/**
 * Issues a bot-challenge token when the visitor ticks "I'm not a robot"
 * (Gap Closure §4). Also plants the anonymous session cookie that keys
 * both the token and the rate limiter.
 *
 * The token binds to the session cookie when one already exists, otherwise
 * to the client IP (the cookie set below isn't proven to stick yet).
 * Verification tries both keys, so first-time, returning, and cookie-less
 * visitors all pass — see challengeKeys() in lib/security/request.ts.
 */
export async function GET(req: NextRequest) {
  const existingSid = req.cookies.get(SESSION_COOKIE)?.value;
  const token = issueChallengeToken(existingSid ?? clientIp(req));

  const res = NextResponse.json({ token });
  if (!existingSid) {
    res.cookies.set(SESSION_COOKIE, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
