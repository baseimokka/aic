import * as React from "react";
import { render } from "@react-email/render";
import {
  BookingConfirmationEmail,
  formatSubmitted,
  formatTravelDate,
  formatTravelers,
  type BookingConfirmationProps,
} from "@/emails/BookingConfirmationEmail";
import { company, siteUrl } from "@/components/email/theme";
import { sendEmailTo, type NotificationEmail } from "@/lib/email/notify";

/** Clean, hand-crafted plain-text fallback (html-to-text collapses the summary
 * table into an unreadable run-on, so we build the text part directly instead). */
function bookingConfirmationText(props: BookingConfirmationProps): string {
  const homeLocale = props.locale && /^[a-z]{2}$/.test(props.locale) ? props.locale : "en";
  const rule = "-".repeat(44);
  const row = (label: string, value: string) => `${(label + ":").padEnd(14)}${value}`;

  const lines: string[] = [
    `${company.name} — ${company.tagline}`,
    "",
    "BOOKING REQUEST RECEIVED",
    "",
    "Thank you for choosing AIC Travel. We've successfully received your booking",
    "request and our travel specialists are now reviewing it. You'll hear from us shortly.",
    "",
    `Explore more destinations: ${siteUrl()}/${homeLocale}`,
    "",
    rule,
    `BOOKING REFERENCE: ${props.reference}   [Received]`,
    rule,
    row("Guest name", props.fullName),
    ...(props.tourTitle ? [row("Tour", props.tourTitle)] : []),
    ...(props.destinationName ? [row("Destination", props.destinationName)] : []),
    row("Travel date", formatTravelDate(props.preferredDate)),
    row("Travellers", formatTravelers(props.adults, props.children)),
    row("Phone", props.phone),
    row("Email", props.email),
    row("Submitted", formatSubmitted(props.submittedAt)),
    rule,
    "",
    "WHAT HAPPENS NEXT?",
    "1. Request received — your booking request has been successfully received.",
    "2. Review — our travel consultants review your request and prepare the best options for you.",
    "3. Contact — we'll reach out shortly with pricing, availability and the next steps.",
    "",
    "WHY BOOK WITH AIC TRAVEL?",
    "- Personalized travel planning, tailored to you",
    "- Best available offers on every itinerary",
    "- Dedicated, expert travel specialists",
    "- Fast, friendly customer support",
    "",
    rule,
    `${company.name} — ${company.partner}`,
    `Phone: ${company.phoneDisplay}`,
    `Email: ${company.email}`,
    `Web:   ${siteUrl()}`,
    "",
    "This is an automated confirmation email — please don't reply directly.",
    `Reach us anytime at ${company.email}.`,
    `© ${new Date().getFullYear()} ${company.name}. All rights reserved.`,
  ];
  return lines.join("\n");
}

/**
 * Render the premium booking confirmation into an HTML + plain-text email.
 * HTML comes from the React Email component; the plain-text fallback is built
 * directly so it reads cleanly rather than as flattened table markup.
 */
export async function renderBookingConfirmationEmail(
  props: BookingConfirmationProps,
): Promise<NotificationEmail> {
  const html = await render(<BookingConfirmationEmail {...props} />);
  return {
    subject: `Your AIC Travel booking request — ${props.reference}`,
    html,
    text: bookingConfirmationText(props),
  };
}

/**
 * Send the customer their booking confirmation. Fully best-effort: a render or
 * delivery failure is logged and swallowed so it can never fail the booking
 * request (the lead is already persisted). The sender defaults to
 * BOOKING_EMAIL_FROM, then the shared NOTIFY_EMAIL_FROM identity.
 */
export async function sendBookingConfirmationEmail(
  props: BookingConfirmationProps,
): Promise<void> {
  try {
    const message = await renderBookingConfirmationEmail(props);
    // `||` (not `??`): an empty BOOKING_EMAIL_FROM must fall through to
    // NOTIFY_EMAIL_FROM, not be sent as an empty (invalid) From address.
    const from = process.env.BOOKING_EMAIL_FROM || process.env.NOTIFY_EMAIL_FROM || undefined;
    await sendEmailTo(props.email, message, from);
  } catch (err) {
    console.error("[email] booking confirmation failed:", err);
  }
}
