import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { contactSchema } from "@/lib/validation/contact";
import { verifyChallenge } from "@/lib/security/challenge";
import { challengeKeys } from "@/lib/security/request";
import { honeypotTripped, throttleResponse } from "@/lib/security/public-form";
import { autoAssignLead } from "@/lib/leads/assignment";
import { notifyUsers, idsByRole } from "@/lib/notifications/notify";
import { leadReference } from "@/lib/leads/reference";
import { sendOpsNotification } from "@/lib/email/notify";
import { contactEmail } from "@/lib/email/templates";

/**
 * Public contact submission (CLAUDE.md §8): same protections as the booking
 * endpoint. Persists as a Lead with source "contact" (the CRM distinguishes
 * by source) and notifies the team via Resend.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (honeypotTripped(body)) {
    return NextResponse.json({ ok: true });
  }

  const throttled = throttleResponse(req);
  if (throttled) return throttled;

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;

  if (!(await verifyChallenge(data.challengeToken, challengeKeys(req)))) {
    return NextResponse.json({ ok: false, error: "challenge" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone ?? "",
      country: "",
      specialRequests: data.message,
      source: "contact",
      locale: data.locale ?? "en",
    },
  });

  // Auto-routing + staff notifications (Addendum §2/§6) — best-effort.
  const assignment = await autoAssignLead(lead.id, {
    country: lead.country,
    locale: lead.locale,
  });
  await notifyUsers({
    userIds: [assignment?.userId, ...(await idsByRole("SALES_ADMIN"))],
    event: "new_lead",
    title: `New contact enquiry · ${leadReference(lead.id, lead.createdAt)}`,
    body: `${lead.fullName} sent a message via the contact form.`,
    linkUrl: `/en/dashboard/leads/${lead.id}`,
  });

  // Best-effort: the lead is persisted; a failed email must not fail the request.
  await sendOpsNotification(
    contactEmail({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      message: data.message,
    }),
  );

  return NextResponse.json({ ok: true });
}
