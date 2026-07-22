"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientIpFromHeaders } from "@/lib/security/request";

export interface LoginState {
  error: string | null;
}

/** Only ever bounce back into the console — never to an attacker-supplied URL. */
function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/en/dashboard") ? next : "/en/dashboard";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Brute-force throttle (§11): the same sliding-window limiter as the public
  // forms, in its own per-IP bucket so sign-ins and form submissions never
  // share a budget. Checked before bcrypt ever runs; authenticated users are
  // unaffected (they never re-enter this action).
  const throttle = checkRateLimit(`login:${clientIpFromHeaders(await headers())}`);
  if (!throttle.ok) {
    const mins = Math.max(1, Math.ceil(throttle.retryAfterSeconds / 60));
    return {
      error: `Too many sign-in attempts. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: safeNext(formData.get("next")),
    });
    return { error: null }; // unreachable — signIn redirects on success
  } catch (err) {
    // One generic message for every failure mode: no account enumeration.
    if (err instanceof AuthError) return { error: "Invalid email or password." };
    throw err; // NEXT_REDIRECT and real errors must propagate
  }
}
