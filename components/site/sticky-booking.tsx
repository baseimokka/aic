"use client";

import { formatMoney } from "@/lib/utils";

export interface StickyBookingLabels {
  from: string;
  perPerson: string;
  originalPrice: string;
  percentOff: string;
  adults: string;
  children: string;
  decrease: string;
  increase: string;
  requestBooking: string;
  whatsapp: string;
  noPayment: string;
}

export function StickyBooking({
  price,
  originalPrice,
  discountPercent,
  currency,
  whatsappHref,
  labels,
  date,
  adults,
  childCount,
  onDateChange,
  onAdultsChange,
  onChildrenChange,
  minDate,
}: {
  /** Per-person price the customer pays (already discounted when applicable). */
  price: number;
  /** Pre-discount price to strike through, or null when no discount is active. */
  originalPrice: number | null;
  discountPercent: number | null;
  currency: string;
  whatsappHref: string;
  labels: StickyBookingLabels;
  date: string;
  adults: number;
  childCount: number;
  onDateChange: (next: string) => void;
  onAdultsChange: (next: number) => void;
  onChildrenChange: (next: number) => void;
  minDate?: string;
}) {
  return (
    <div className="sticky top-24 rounded-2xl border border-line bg-white p-[22px] shadow-lift">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xs text-faint">{labels.from}</span>
          {originalPrice != null && (
            <div className="flex items-center gap-2">
              <s className="text-[14px] font-semibold text-faint tabular-nums">
                <span className="sr-only">{labels.originalPrice}: </span>
                {formatMoney(originalPrice, currency)}
              </s>
              {discountPercent != null && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                  <span aria-hidden>−{discountPercent}%</span>
                  <span className="sr-only">{labels.percentOff.replace("{percent}", String(discountPercent))}</span>
                </span>
              )}
            </div>
          )}
          <div className="text-[28px] font-extrabold leading-none text-ink tabular-nums">{formatMoney(price, currency)}</div>
        </div>
        <span className="text-xs text-faint">{labels.perPerson}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <input
          type="date"
          aria-label="Preferred date"
          min={minDate}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-11 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 text-sm text-ink"
        />
        <CounterRow
          label={labels.adults}
          value={adults}
          min={1}
          max={40}
          onChange={onAdultsChange}
          decreaseLabel={`${labels.decrease} — ${labels.adults}`}
          increaseLabel={`${labels.increase} — ${labels.adults}`}
        />
        <CounterRow
          label={labels.children}
          value={childCount}
          min={0}
          max={20}
          onChange={onChildrenChange}
          decreaseLabel={`${labels.decrease} — ${labels.children}`}
          increaseLabel={`${labels.increase} — ${labels.children}`}
        />
      </div>

      <a href="#request" className="mt-3.5 flex h-12 items-center justify-center rounded-xl bg-accent font-bold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.98] motion-reduce:active:scale-100">
        {labels.requestBooking}
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-whatsapp font-bold text-white"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
        </svg>
        {labels.whatsapp}
      </a>
      <div className="mt-3 text-center text-xs text-faint">{labels.noPayment}</div>
    </div>
  );
}

function CounterRow({
  label,
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border-[1.5px] border-line-input py-1 pe-1 ps-3.5">
      <span className="text-sm text-ink" aria-live="polite">
        {value} {label}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          aria-label={decreaseLabel}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-lg text-ink"
        >
          &minus;
        </button>
        <button
          type="button"
          aria-label={increaseLabel}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-lg text-ink"
        >
          +
        </button>
      </div>
    </div>
  );
}
