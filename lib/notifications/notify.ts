import { prisma } from "@/lib/db/client";
import { sendEmailTo } from "@/lib/email/notify";
import type { Role } from "@prisma/client";

/**
 * The five notification triggers (Gap Closure Addendum §6). In-app rows are
 * created for every event; the addendum's trigger matrix marks which events
 * also email their recipients. Everything here is best-effort — a failed
 * notification must never fail the mutation that raised it.
 */
export type NotificationEvent =
  | "new_lead"
  | "new_transfer"
  | "status_changed"
  | "reassigned"
  | "paid_in_full"
  | "comment";

const EMAIL_EVENTS: ReadonlySet<NotificationEvent> = new Set(["new_lead", "new_transfer", "reassigned"]);

export interface NotifyInput {
  /** Candidate recipients — nulls and duplicates are dropped. */
  userIds: Array<string | null | undefined>;
  event: NotificationEvent;
  title: string;
  body?: string | null;
  linkUrl?: string | null;
  /** The acting user — never notified about their own action. */
  actorId?: string | null;
}

export async function notifyUsers(input: NotifyInput): Promise<void> {
  try {
    const ids = [
      ...new Set(input.userIds.filter((id): id is string => Boolean(id) && id !== input.actorId)),
    ];
    if (ids.length === 0) return;

    await prisma.notification.createMany({
      data: ids.map((userId) => ({
        userId,
        event: input.event,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
      })),
    });

    if (EMAIL_EVENTS.has(input.event)) {
      const users = await prisma.user.findMany({
        where: { id: { in: ids }, archivedAt: null },
        select: { email: true },
      });
      const html = notificationHtml(input);
      const text = `${input.title}${input.body ? `\n\n${input.body}` : ""}${input.linkUrl ? `\n\n${absoluteUrl(input.linkUrl)}` : ""}`;
      await Promise.all(
        users.map((u) => sendEmailTo(u.email, { subject: input.title, html, text })),
      );
    }
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}

/** Active (non-archived) user ids holding any of the given roles. */
export async function idsByRole(...roles: Role[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, archivedAt: null },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return path.startsWith("http") ? path : `${base}${path}`;
}

function notificationHtml(input: NotifyInput): string {
  const link = input.linkUrl
    ? `<p style="margin:24px 0 0;"><a href="${absoluteUrl(input.linkUrl)}" style="display:inline-block;background:#F0602F;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">Open in the console</a></p>`
    : "";
  return `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f8f8fa;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #eae9ef;border-radius:16px;padding:28px 32px;color:#201146;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9895a3;">AIC Travel · Management Console</p>
      <h1 style="margin:0;font-size:20px;">${input.title}</h1>
      ${input.body ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3f3a55;">${input.body}</p>` : ""}
      ${link}
    </div>
  </div>`;
}
