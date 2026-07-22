import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { renderBookingConfirmationEmail } from "@/lib/email/booking-confirmation";
import type { BookingConfirmationProps } from "@/emails/BookingConfirmationEmail";

/** Sample data for previewing / test-sending the confirmation email. */
function sampleProps(general: boolean, to?: string): BookingConfirmationProps {
  return {
    reference: "AIC-2026-8F3A21",
    fullName: "Amelia Hartley",
    tourTitle: general ? null : "Nile Cruise & Valley of the Kings — 5 Days",
    destinationName: general ? null : "Luxor & Aswan",
    email: to ?? "amelia.hartley@example.com",
    phone: "+44 7700 900123",
    country: "United Kingdom",
    preferredDate: general ? null : "2026-10-14",
    adults: 2,
    children: 1,
    submittedAt: new Date(),
    locale: "en",
  };
}

/**
 * Dev-only preview of the customer booking confirmation email.
 *   GET  /api/dev/booking-email                → rendered HTML (tour booking)
 *   GET  /api/dev/booking-email?format=text    → plain-text fallback
 *   GET  /api/dev/booking-email?variant=general → general enquiry (no tour/destination)
 * Never available in production.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const general = url.searchParams.get("variant") === "general";
  const asText = url.searchParams.get("format") === "text";

  const message = await renderBookingConfirmationEmail(sampleProps(general));

  return new Response(asText ? message.text : message.html, {
    headers: {
      "content-type": asText ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * Dev-only test-send: renders the sample confirmation and delivers it via Resend
 * so you can review the real email in your own inbox. Surfaces the Resend
 * response (unlike the best-effort production path) so failures are visible.
 *   POST /api/dev/booking-email?to=you@example.com[&variant=general]
 * Never available in production.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ ok: false, error: "missing ?to= recipient" }, { status: 400 });
  }
  const general = url.searchParams.get("variant") === "general";

  const key = process.env.RESEND_API_KEY;
  if (!key || !key.startsWith("re_")) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 400 });
  }

  const message = await renderBookingConfirmationEmail(sampleProps(general, to));
  const from =
    process.env.BOOKING_EMAIL_FROM ||
    process.env.NOTIFY_EMAIL_FROM ||
    "AIC Travel <onboarding@resend.dev>";

  const { data, error } = await new Resend(key).emails.send({
    from,
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  return NextResponse.json({ ok: !error, id: data?.id ?? null, from, to, error: error ?? null });
}
