import { Resend } from "resend";

/**
 * Ops notification email via Resend (CLAUDE.md §2, §8). Degrades gracefully:
 * without a configured key/recipient it logs and skips, so local dev and
 * environments without email still accept submissions.
 * Callers must not let email failure fail the request — the lead is already
 * persisted; delivery is best-effort.
 */
export interface NotificationEmail {
  subject: string;
  html: string;
  text: string;
}

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || !key.startsWith("re_")) return null;
  return new Resend(key);
}

export async function sendOpsNotification(email: NotificationEmail): Promise<void> {
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!to) {
    console.warn(`[email] NOTIFY_EMAIL_TO not set — skipped notification: ${email.subject}`);
    return;
  }
  await sendEmailTo(to, email);
}

/**
 * Same graceful degradation as sendOpsNotification, for an explicit recipient
 * (staff notifications, customer confirmations). `fromOverride` lets a
 * customer-facing sender differ from the internal ops sender.
 */
export async function sendEmailTo(
  to: string,
  email: NotificationEmail,
  fromOverride?: string,
): Promise<void> {
  // `||` (not `??`) so an empty-string env var / override falls through to the
  // next sender — an empty From makes Resend reject with 422 "domain is invalid".
  const from = fromOverride || process.env.NOTIFY_EMAIL_FROM || "AIC Travel <onboarding@resend.dev>";
  const client = resendClient();

  if (!client) {
    console.warn(`[email] Resend not configured — skipped notification: ${email.subject}`);
    return;
  }

  try {
    const { error } = await client.emails.send({
      from,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) console.error("[email] Resend rejected the send:", error);
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
