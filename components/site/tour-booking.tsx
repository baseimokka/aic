"use client";

import { useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { StickyBooking, type StickyBookingLabels } from "@/components/site/sticky-booking";
import { BookingForm } from "@/components/site/booking-form";

/**
 * Shares one booking state (date + travellers) between the sticky sidebar and
 * the request form, so choices made in the sidebar carry straight into the
 * form the "Request booking" button scrolls to.
 */
export function TourBooking({
  effectivePrice,
  originalPrice,
  discountPercent,
  currency,
  priceLabel,
  whatsappHref,
  tourSlug,
  tourTitle,
  locale,
  stickyLabels,
  bookingLabels,
  children,
}: {
  /** Per-person price the customer pays (already discounted when applicable). */
  effectivePrice: number;
  /** Pre-discount price to strike through, or null when no discount is active. */
  originalPrice: number | null;
  discountPercent: number | null;
  currency: string;
  priceLabel: string;
  whatsappHref: string;
  tourSlug: string;
  tourTitle: string;
  locale: string;
  stickyLabels: StickyBookingLabels;
  bookingLabels: Dictionary["booking"];
  children: ReactNode;
}) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [childCount, setChildCount] = useState(0);

  return (
    <>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {children}
        <aside>
          <StickyBooking
            price={effectivePrice}
            originalPrice={originalPrice}
            discountPercent={discountPercent}
            currency={currency}
            whatsappHref={whatsappHref}
            labels={stickyLabels}
            minDate={todayIso}
            date={date}
            adults={adults}
            childCount={childCount}
            onDateChange={setDate}
            onAdultsChange={setAdults}
            onChildrenChange={setChildCount}
          />
        </aside>
      </div>

      <section id="request" className="mt-14 scroll-mt-24">
        <BookingForm
          labels={bookingLabels}
          tourSlug={tourSlug}
          tourTitle={tourTitle}
          locale={locale}
          whatsappHref={whatsappHref}
          effectivePrice={effectivePrice}
          originalPrice={originalPrice}
          currency={currency}
          priceLabel={priceLabel}
          adults={adults}
          childCount={childCount}
          preferredDate={date}
          onAdultsChange={setAdults}
          onChildrenChange={setChildCount}
          onDateChange={setDate}
        />
      </section>
    </>
  );
}
