import * as React from "react";
import { EmailLayout } from "@/components/email/EmailLayout";
import { EmailHeader } from "@/components/email/EmailHeader";
import { Hero } from "@/components/email/Hero";
import { CTAButton } from "@/components/email/CTAButton";
import { BookingSummary, type SummaryItem } from "@/components/email/BookingSummary";
import { Timeline, type TimelineStep } from "@/components/email/Timeline";
import { TrustSection } from "@/components/email/TrustSection";
import { Footer } from "@/components/email/Footer";
import { siteUrl } from "@/components/email/theme";

export interface BookingConfirmationProps {
  /** Human-friendly lead reference, e.g. AIC-2026-ABC123. */
  reference: string;
  fullName: string;
  /** Requested tour title (English) — null for a general enquiry. */
  tourTitle: string | null;
  /** Destination name (English) — null when unknown. */
  destinationName: string | null;
  /** Customer's email address (echoed back in the summary). */
  email: string;
  phone: string;
  country: string;
  /** Preferred travel date as `YYYY-MM-DD`, or null when not supplied. */
  preferredDate: string | null;
  adults: number;
  children: number;
  /** When the request was received (lead.createdAt). */
  submittedAt: Date | string;
  /** Locale the request came from — used only to build the "explore" home link. */
  locale?: string;
}

export function formatTravelDate(value: string | null): string {
  if (!value) return "Flexible — to be confirmed";
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatSubmitted(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d)} UTC`;
}

export function formatTravelers(adults: number, children: number): string {
  const a = `${adults} adult${adults === 1 ? "" : "s"}`;
  if (children > 0) return `${a}, ${children} child${children === 1 ? "" : "ren"}`;
  return a;
}

const TIMELINE: TimelineStep[] = [
  { title: "Request received", body: "Your booking request has been successfully received.", done: true },
  { title: "Review", body: "Our travel consultants review your request and prepare the best options for you." },
  { title: "Contact", body: "We'll reach out shortly with pricing, availability and the next steps." },
];

const TRUST_POINTS = [
  "Personalized travel planning, tailored to you",
  "Best available offers on every itinerary",
  "Dedicated, expert travel specialists",
  "Fast, friendly customer support",
];

export function BookingConfirmationEmail({
  reference,
  fullName,
  tourTitle,
  destinationName,
  email: customerEmail,
  phone,
  preferredDate,
  adults,
  children,
  submittedAt,
  locale,
}: BookingConfirmationProps) {
  const homeLocale = locale && /^[a-z]{2}$/.test(locale) ? locale : "en";
  const homeHref = `${siteUrl()}/${homeLocale}`;

  const items: SummaryItem[] = [
    { icon: "👤", label: "Guest name", value: fullName },
    ...(tourTitle ? [{ icon: "🧭", label: "Tour / experience", value: tourTitle }] : []),
    ...(destinationName ? [{ icon: "📍", label: "Destination", value: destinationName }] : []),
    { icon: "📅", label: "Travel date", value: formatTravelDate(preferredDate) },
    { icon: "👥", label: "Travellers", value: formatTravelers(adults, children) },
    { icon: "📞", label: "Phone", value: phone },
    { icon: "✉️", label: "Email", value: customerEmail },
    { icon: "🕒", label: "Submitted", value: formatSubmitted(submittedAt) },
  ];

  const preview = `Booking request ${reference} received — our specialists are reviewing it.`;

  return (
    <EmailLayout preview={preview}>
      <EmailHeader />
      <Hero
        headline="Booking Request Received"
        lead="Thank you for choosing AIC Travel."
        body="We've successfully received your booking request and our travel specialists are now reviewing it. You'll hear from us shortly."
      />
      <CTAButton href={homeHref} label="Explore More Destinations" />
      <BookingSummary reference={reference} statusLabel="Received" items={items} />
      <Timeline heading="What happens next?" steps={TIMELINE} />
      <TrustSection heading="Why book with AIC Travel?" points={TRUST_POINTS} />
      <Footer />
    </EmailLayout>
  );
}

export default BookingConfirmationEmail;
