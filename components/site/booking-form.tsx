"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { formatMoney } from "@/lib/utils";
import { ChallengeCheckbox } from "@/components/site/challenge-checkbox";
import { ThrottleNotice } from "@/components/site/throttle-notice";

type Status = "idle" | "sending" | "success";

export function BookingForm({
  labels,
  tourSlug,
  tourTitle,
  priceLabel,
  effectivePrice,
  originalPrice,
  currency,
  locale,
  whatsappHref,
  adults,
  childCount,
  preferredDate,
  onAdultsChange,
  onChildrenChange,
  onDateChange,
}: {
  labels: Dictionary["booking"];
  tourSlug: string;
  tourTitle: string;
  priceLabel: string;
  /** Per-person price the customer pays (already discounted when applicable). */
  effectivePrice: number;
  /** Pre-discount price to strike through, or null when no discount is active. */
  originalPrice: number | null;
  currency: string;
  locale: string;
  whatsappHref: string;
  adults: number;
  childCount: number;
  preferredDate: string;
  onAdultsChange: (next: number) => void;
  onChildrenChange: (next: number) => void;
  onDateChange: (next: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [challengeReset, setChallengeReset] = useState(0);
  const [reference, setReference] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const todayIso = new Date().toISOString().slice(0, 10); // date input floor

  // The shared Zod schema (§26) decides validity; messages come from the locale catalog.
  function localizeField(field: string): string {
    if (field === "email") return labels.invalidEmail;
    if (field === "consent") return labels.consentRequired;
    if (field === "challengeToken") return labels.challengeRequired;
    if (field === "preferredDate") return labels.invalidDate;
    return labels.required;
  }

  function showFieldErrors(fields: string[]) {
    const next: Record<string, string> = {};
    for (const field of fields) if (field && !next[field]) next[field] = localizeField(field);
    setErrors(next);
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending" || retryAfter !== null) return;
    const fd = new FormData(e.currentTarget);
    if (fd.get("company")) return; // honeypot
    setFormError(null);

    const text = (name: string) => String(fd.get(name) ?? "").trim();
    const payload = {
      tourSlug,
      fullName: text("fullName"),
      email: text("email"),
      phone: text("phone"),
      country: text("country"),
      preferredDate: text("preferredDate") || undefined,
      adults,
      children: childCount,
      hotelName: text("hotelName") || undefined,
      roomNumber: text("roomNumber") || undefined,
      specialRequests: text("specialRequests") || undefined,
      consent: fd.get("consent") === "on",
      locale,
      challengeToken: String(fd.get("challengeToken") ?? ""),
    };

    const result = bookingRequestSchema.safeParse(payload);
    if (!result.success) {
      showFieldErrors(result.error.issues.map((i) => String(i.path[0] ?? "")));
      return;
    }
    setErrors({});
    setStatus("sending");

    try {
      const res = await fetch("/api/booking-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (res.ok) {
        const json = (await res.json()) as { reference?: string };
        setReference(json.reference ?? "");
        setStatus("success");
        return;
      }

      setStatus("idle");
      const json = (await res.json().catch(() => null)) as
        | { error?: string; retryAfterSeconds?: number; fieldErrors?: Record<string, string[]> }
        | null;

      if (res.status === 429) {
        const headerRetry = Number(res.headers.get("Retry-After"));
        setRetryAfter(json?.retryAfterSeconds ?? (Number.isFinite(headerRetry) ? headerRetry : 600));
        return;
      }
      if (res.status === 422 && json?.fieldErrors) {
        showFieldErrors(Object.keys(json.fieldErrors));
        return;
      }
      if (res.status === 400 && json?.error === "challenge") {
        setErrors({ challengeToken: labels.challengeError });
        setChallengeReset((n) => n + 1);
        return;
      }
      if (res.status === 409 && json?.error === "tour_unavailable") {
        setFormError(labels.tourUnavailable);
        return;
      }
      setFormError(labels.errorGeneric);
    } catch {
      setStatus("idle");
      setFormError(labels.errorGeneric);
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[18px] border border-line bg-white p-8 text-center shadow-card sm:p-10">
        <span className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[color:var(--color-teal-soft,#E4F3EB)]">
          <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="var(--color-success)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <h2 className="font-serif text-[26px] font-semibold text-ink">{labels.successTitle}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">{labels.successBody}</p>
        <div className="mx-auto mt-6 max-w-sm rounded-xl border border-line bg-cream p-4 text-start">
          <div className="text-xs text-faint">{labels.reference}</div>
          <div className="text-[15px] font-bold text-ink">{reference}</div>
          <div className="mt-2 text-[13px] text-muted">
            {tourTitle} · {labels.adults}: {adults}
            {childCount > 0 && <> · {labels.children}: {childCount}</>}
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp font-bold text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
            </svg>
            {labels.chatNow}
          </a>
          <a href={`/${locale}/tours`} className="flex h-11 items-center justify-center rounded-xl border-[1.5px] border-ink bg-white font-bold text-ink hover:bg-surface-2">
            {labels.backToTours}
          </a>
        </div>
      </div>
    );
  }

  const inputCls =
    "h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 text-[15px] text-ink placeholder:text-faint focus-visible:border-accent";
  const labelCls = "mb-1.5 block text-[13px] font-semibold text-ink";
  const err = (m?: string) =>
    m ? (
      <p className="mt-1 text-xs font-medium text-danger" role="alert">
        {m}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="rounded-[18px] border border-line bg-white p-6 shadow-card sm:p-8">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{labels.step}</span>
      <h2 className="mt-2 font-serif text-[28px] font-semibold text-ink">{labels.title}</h2>
      <p className="mt-1 text-sm text-muted">{labels.subtitle}</p>

      {/* Selected tour */}
      <div className="mt-6 flex items-center gap-3.5 rounded-xl border border-line bg-cream p-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-surface-2 text-accent" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-faint">{labels.selectedTour}</div>
          <div className="truncate text-[15px] font-bold text-ink">{tourTitle}</div>
        </div>
        <span className="whitespace-nowrap text-[15px] font-extrabold text-ink">{priceLabel}</span>
      </div>

      {/* Fields */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="b-name" className={labelCls}>
            {labels.fullName} *
          </label>
          <input id="b-name" name="fullName" autoComplete="name" aria-invalid={!!errors.fullName} className={inputCls} />
          {err(errors.fullName)}
        </div>
        <div>
          <label htmlFor="b-email" className={labelCls}>
            {labels.email} *
          </label>
          <input id="b-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={inputCls} />
          {err(errors.email)}
        </div>
        <div>
          <label htmlFor="b-phone" className={labelCls}>
            {labels.phone} *
          </label>
          <input
            id="b-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby="b-phone-note"
            className={inputCls}
          />
          <p id="b-phone-note" className="mt-1.5 text-xs text-faint">
            {labels.phoneWhatsAppNote}
          </p>
          {err(errors.phone)}
        </div>
        <div>
          <label htmlFor="b-country" className={labelCls}>
            {labels.country}
          </label>
          <input id="b-country" name="country" autoComplete="country-name" aria-invalid={!!errors.country} className={inputCls} />
          {err(errors.country)}
        </div>
        <div>
          <label htmlFor="b-date" className={labelCls}>
            {labels.date}
          </label>
          <input
            id="b-date"
            name="preferredDate"
            type="date"
            min={todayIso}
            value={preferredDate}
            onChange={(e) => onDateChange(e.target.value)}
            aria-invalid={!!errors.preferredDate}
            className={inputCls}
          />
          {err(errors.preferredDate)}
        </div>
        <CountField
          label={labels.adults}
          value={adults}
          min={1}
          max={40}
          onChange={onAdultsChange}
          decreaseLabel={`${labels.decrease} — ${labels.adults}`}
          increaseLabel={`${labels.increase} — ${labels.adults}`}
        />
        <CountField
          label={labels.children}
          value={childCount}
          min={0}
          max={20}
          onChange={onChildrenChange}
          decreaseLabel={`${labels.decrease} — ${labels.children}`}
          increaseLabel={`${labels.increase} — ${labels.children}`}
        />
        <div>
          <label htmlFor="b-hotel" className={labelCls}>
            {labels.hotelName} <span className="font-normal text-faint">({labels.optional})</span>
          </label>
          <input id="b-hotel" name="hotelName" className={inputCls} />
        </div>
        <div>
          <label htmlFor="b-room" className={labelCls}>
            {labels.roomNumber} <span className="font-normal text-faint">({labels.optional})</span>
          </label>
          <input id="b-room" name="roomNumber" className={inputCls} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="b-requests" className={labelCls}>
          {labels.requests}
        </label>
        <textarea id="b-requests" name="specialRequests" rows={3} className="w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-faint" />
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="consent" aria-invalid={!!errors.consent} className="mt-0.5 h-5 w-5 accent-accent" />
        <span>{labels.consent}</span>
      </label>
      {err(errors.consent)}

      <div className="mt-4">
        <ChallengeCheckbox
          labels={{ label: labels.challengeLabel, verified: labels.challengeVerified, error: labels.challengeError }}
          error={errors.challengeToken}
          resetSignal={challengeReset}
        />
      </div>

      {formError && (
        <p className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3.5 text-[13px] font-medium text-danger" role="alert">
          {formError}
        </p>
      )}

      {retryAfter !== null && (
        <div className="mt-4">
          <ThrottleNotice
            labels={{
              title: labels.throttleTitle,
              body: labels.throttleBody,
              countdown: labels.throttleCountdown,
              whatsapp: labels.whatsappFallback,
            }}
            retryAfterSeconds={retryAfter}
            whatsappHref={whatsappHref}
            onExpire={() => setRetryAfter(null)}
          />
        </div>
      )}

      {/* Total = effective (discounted) per-person price × travelers (adults + children). */}
      <div className="mt-5 flex items-center justify-between rounded-xl border border-line bg-cream px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{labels.totalPrice}</div>
          <div className="mt-0.5 text-[12px] text-muted tabular-nums">
            {adults + childCount} ×{" "}
            {originalPrice != null && (
              <>
                <s className="text-faint">
                  <span className="sr-only">{labels.originalPrice}: </span>
                  {formatMoney(originalPrice, currency)}
                </s>{" "}
              </>
            )}
            {formatMoney(effectivePrice, currency)}
          </div>
        </div>
        <span className="whitespace-nowrap text-[24px] font-extrabold text-ink tabular-nums">
          {formatMoney(effectivePrice * (adults + childCount), currency)}
        </span>
      </div>

      <button
        type="submit"
        disabled={status === "sending" || retryAfter !== null}
        className="mt-4 flex h-[52px] w-full items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60"
      >
        {status === "sending" ? labels.sending : labels.submit}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-faint">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {labels.securityNote}
      </div>
    </form>
  );
}

export function CountField({
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
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      <div className="flex h-12 items-center justify-between overflow-hidden rounded-[10px] border-[1.5px] border-line-input">
        <button type="button" aria-label={decreaseLabel} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-full w-11 items-center justify-center bg-surface-2 text-xl text-ink">
          &minus;
        </button>
        <span aria-live="polite" className="flex-1 text-center text-[15px] font-semibold text-ink">
          {value}
        </span>
        <button type="button" aria-label={increaseLabel} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-full w-11 items-center justify-center bg-surface-2 text-xl text-ink">
          +
        </button>
      </div>
    </div>
  );
}
