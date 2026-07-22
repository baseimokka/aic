"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { bookingRequestSchema } from "@/lib/validation/booking";
import { CountField } from "@/components/site/booking-form";
import { ChallengeCheckbox } from "@/components/site/challenge-checkbox";
import { ThrottleNotice } from "@/components/site/throttle-notice";

type Status = "idle" | "sending" | "success";
type TripStyle = "solo" | "couple" | "family" | "group";

const STYLES: TripStyle[] = ["solo", "couple", "family", "group"];
/** Duration choices offered by the select — mirrors the old site's 1–14+ range. */
const DURATIONS = [...Array.from({ length: 14 }, (_, i) => String(i + 1)), "15+"];

/**
 * Tailor-made trip request. Reuses the whole booking-request pipeline
 * (honeypot, throttle, challenge, Lead + CRM auto-assignment) with no tour
 * attached: structured preferences are composed into `specialRequests` in
 * ENGLISH — the CRM is English-only, so staff read one consistent format
 * regardless of the visitor's locale — and `requestType: "tailor-made"` tags
 * the lead's source.
 */
export function TailorMadeForm({
  labels,
  tm,
  locale,
  whatsappHref,
}: {
  labels: Dictionary["booking"];
  tm: Dictionary["tailorMade"];
  locale: string;
  whatsappHref: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [challengeReset, setChallengeReset] = useState(0);
  const [reference, setReference] = useState("");
  const [adults, setAdults] = useState(2);
  const [childCount, setChildCount] = useState(0);
  const [style, setStyle] = useState<TripStyle | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const todayIso = new Date().toISOString().slice(0, 10);

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

    // A tailor-made request without a trip description is unactionable.
    const trip = text("trip");
    if (!trip) {
      showFieldErrors(["trip"]);
      return;
    }

    // Staff-facing composition — fixed English labels for a consistent CRM read.
    const duration = text("duration");
    const prefs = [
      style ? `Trip style: ${style}` : null,
      duration ? `Duration: ${duration} day(s)` : null,
    ].filter(Boolean);
    const specialRequests = [prefs.join(" · "), trip].filter(Boolean).join("\n\n");

    const payload = {
      fullName: text("fullName"),
      email: text("email"),
      phone: text("phone"),
      country: text("country"),
      preferredDate: text("preferredDate") || undefined,
      adults,
      children: childCount,
      specialRequests,
      requestType: "tailor-made" as const,
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
            {tm.successNote} · {labels.adults}: {adults}
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
      <h2 className="mt-2 font-serif text-[28px] font-semibold text-ink">{tm.formTitle}</h2>
      <p className="mt-1 text-sm text-muted">{tm.formSubtitle}</p>

      {/* Contact details */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="tm-name" className={labelCls}>
            {labels.fullName} *
          </label>
          <input id="tm-name" name="fullName" autoComplete="name" aria-invalid={!!errors.fullName} className={inputCls} />
          {err(errors.fullName)}
        </div>
        <div>
          <label htmlFor="tm-email" className={labelCls}>
            {labels.email} *
          </label>
          <input id="tm-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={inputCls} />
          {err(errors.email)}
        </div>
        <div>
          <label htmlFor="tm-phone" className={labelCls}>
            {labels.phone} *
          </label>
          <input
            id="tm-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby="tm-phone-note"
            className={inputCls}
          />
          <p id="tm-phone-note" className="mt-1.5 text-xs text-faint">
            {labels.phoneWhatsAppNote}
          </p>
          {err(errors.phone)}
        </div>
        <div>
          <label htmlFor="tm-country" className={labelCls}>
            {labels.country}
          </label>
          <input id="tm-country" name="country" autoComplete="country-name" aria-invalid={!!errors.country} className={inputCls} />
          {err(errors.country)}
        </div>
        <div>
          <label htmlFor="tm-date" className={labelCls}>
            {labels.date} <span className="font-normal text-faint">({labels.optional})</span>
          </label>
          <input id="tm-date" name="preferredDate" type="date" min={todayIso} aria-invalid={!!errors.preferredDate} className={inputCls} />
          {err(errors.preferredDate)}
        </div>
        <div>
          <label htmlFor="tm-duration" className={labelCls}>
            {tm.durationLabel} <span className="font-normal text-faint">({labels.optional})</span>
          </label>
          <select id="tm-duration" name="duration" defaultValue="" className={inputCls}>
            <option value="">{tm.durationAny}</option>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d === "15+" ? tm.duration15Plus : `${d} ${d === "1" ? tm.durationDay : tm.durationDays}`}
              </option>
            ))}
          </select>
        </div>
        <CountField
          label={labels.adults}
          value={adults}
          min={1}
          max={40}
          onChange={setAdults}
          decreaseLabel={`${labels.decrease} — ${labels.adults}`}
          increaseLabel={`${labels.increase} — ${labels.adults}`}
        />
        <CountField
          label={labels.children}
          value={childCount}
          min={0}
          max={20}
          onChange={setChildCount}
          decreaseLabel={`${labels.decrease} — ${labels.children}`}
          increaseLabel={`${labels.increase} — ${labels.children}`}
        />
      </div>

      {/* Trip style — chip-styled radio group (large touch targets, RTL-safe). */}
      <fieldset className="mt-5">
        <legend className={labelCls}>{tm.styleLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <label
              key={s}
              className={`flex h-11 cursor-pointer items-center rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${
                style === s ? "border-accent bg-accent-soft text-accent-deep" : "border-line-input bg-white text-ink hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="tripStyle"
                value={s}
                checked={style === s}
                onChange={() => setStyle(s)}
                className="sr-only"
              />
              {tm.styles[s]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* The heart of the request */}
      <div className="mt-5">
        <label htmlFor="tm-trip" className={labelCls}>
          {tm.tripLabel} *
        </label>
        <textarea
          id="tm-trip"
          name="trip"
          rows={5}
          maxLength={1800}
          placeholder={tm.tripPlaceholder}
          aria-invalid={!!errors.trip}
          className="w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-faint focus-visible:border-accent"
        />
        {err(errors.trip)}
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

      <button
        type="submit"
        disabled={status === "sending" || retryAfter !== null}
        className="mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60"
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
