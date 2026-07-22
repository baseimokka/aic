"use client";

import { useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TransferFormData } from "@/lib/db/pages";
import { transferRequestSchema } from "@/lib/validation/transfer";
import { formatMoney } from "@/lib/utils";
import { ChallengeCheckbox } from "@/components/site/challenge-checkbox";
import { ThrottleNotice } from "@/components/site/throttle-notice";
import { CountField } from "@/components/site/booking-form";

type Status = "idle" | "sending" | "success";

/**
 * Public transfer request form (Transfer module). Reuses the booking-form
 * spine: shared Zod schema for client UX, honeypot, challenge, throttle
 * countdown. The displayed price resolves from the admin-configured rate
 * matrix (vehicle-specific row first, then the route's any-vehicle row);
 * the server re-resolves and snapshots it on submission.
 */
export function TransferForm({
  labels,
  booking,
  data,
  locale,
  whatsappHref,
}: {
  labels: Dictionary["transfers"];
  booking: Dictionary["booking"];
  data: TransferFormData;
  locale: string;
  whatsappHref: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [challengeReset, setChallengeReset] = useState(0);
  const [reference, setReference] = useState("");

  const [vehicleId, setVehicleId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [passengers, setPassengers] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const todayIso = new Date().toISOString().slice(0, 10); // date input floor

  const vehicle = data.vehicles.find((v) => v.id === vehicleId) ?? null;
  const maxPassengers = vehicle?.capacity ?? 200;

  // Vehicle-specific rate wins; the route's any-vehicle rate is the fallback.
  const rate = useMemo(() => {
    if (!fromId || !toId || fromId === toId) return null;
    const candidates = data.rates.filter((r) => r.fromLocationId === fromId && r.toLocationId === toId);
    return (
      candidates.find((r) => r.vehicleId === vehicleId) ??
      candidates.find((r) => r.vehicleId === null) ??
      null
    );
  }, [data.rates, fromId, toId, vehicleId]);

  // The shared Zod schema decides validity; messages come from the locale catalog.
  function localizeField(field: string): string {
    if (field === "email") return booking.invalidEmail;
    if (field === "consent") return booking.consentRequired;
    if (field === "challengeToken") return booking.challengeRequired;
    if (field === "pickupDate") return labels.invalidPickupDate;
    if (field === "toLocationId" && fromId && fromId === toId) return labels.sameLocations;
    return booking.required;
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
      fullName: text("fullName"),
      email: text("email"),
      phone: text("phone"),
      pickupDate: text("pickupDate"),
      passengers,
      vehicleId,
      fromLocationId: fromId,
      toLocationId: toId,
      notes: text("notes") || undefined,
      consent: fd.get("consent") === "on",
      locale,
      challengeToken: String(fd.get("challengeToken") ?? ""),
    };

    const result = transferRequestSchema.safeParse(payload);
    if (!result.success) {
      showFieldErrors(result.error.issues.map((i) => String(i.path[0] ?? "")));
      return;
    }
    setErrors({});
    setStatus("sending");

    try {
      const res = await fetch("/api/transfer-request", {
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
        setErrors({ challengeToken: booking.challengeError });
        setChallengeReset((n) => n + 1);
        return;
      }
      if (res.status === 409 && json?.error === "route_unavailable") {
        setFormError(labels.routeUnavailable);
        return;
      }
      setFormError(booking.errorGeneric);
    } catch {
      setStatus("idle");
      setFormError(booking.errorGeneric);
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
          <div className="text-xs text-faint">{booking.reference}</div>
          <div className="text-[15px] font-bold text-ink">{reference}</div>
          <div className="mt-2 text-[13px] text-muted">
            {data.locations.find((l) => l.id === fromId)?.name} → {data.locations.find((l) => l.id === toId)?.name}
            {vehicle ? <> · {vehicle.name}</> : null}
          </div>
        </div>
        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-whatsapp font-bold text-white">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
              <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
            </svg>
            {booking.chatNow}
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

      <h2 className="font-serif text-[28px] font-semibold text-ink">{labels.formTitle}</h2>
      <p className="mt-1 text-sm text-muted">{labels.formSubtitle}</p>

      {/* Route + vehicle */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="t-from" className={labelCls}>
            {labels.from} *
          </label>
          <select
            id="t-from"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            aria-invalid={!!errors.fromLocationId}
            className={inputCls}
          >
            <option value="">{labels.selectOption}</option>
            {data.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {err(errors.fromLocationId)}
        </div>
        <div>
          <label htmlFor="t-to" className={labelCls}>
            {labels.to} *
          </label>
          <select
            id="t-to"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            aria-invalid={!!errors.toLocationId}
            className={inputCls}
          >
            <option value="">{labels.selectOption}</option>
            {data.locations
              .filter((l) => l.id !== fromId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
          {err(errors.toLocationId)}
        </div>
        <div>
          <label htmlFor="t-vehicle" className={labelCls}>
            {labels.vehicle} *
          </label>
          <select
            id="t-vehicle"
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
              const cap = data.vehicles.find((v) => v.id === e.target.value)?.capacity;
              if (cap && passengers > cap) setPassengers(cap);
            }}
            aria-invalid={!!errors.vehicleId}
            className={inputCls}
          >
            <option value="">{labels.selectOption}</option>
            {data.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.capacity} {labels.seats}
              </option>
            ))}
          </select>
          {err(errors.vehicleId)}
        </div>
        <CountField
          label={labels.passengers}
          value={passengers}
          min={1}
          max={maxPassengers}
          onChange={setPassengers}
          decreaseLabel={`${booking.decrease} — ${labels.passengers}`}
          increaseLabel={`${booking.increase} — ${labels.passengers}`}
        />
      </div>

      {/* Contact + date */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="t-name" className={labelCls}>
            {booking.fullName} *
          </label>
          <input id="t-name" name="fullName" autoComplete="name" aria-invalid={!!errors.fullName} className={inputCls} />
          {err(errors.fullName)}
        </div>
        <div>
          <label htmlFor="t-email" className={labelCls}>
            {booking.email} *
          </label>
          <input id="t-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={inputCls} />
          {err(errors.email)}
        </div>
        <div>
          <label htmlFor="t-phone" className={labelCls}>
            {booking.phone} *
          </label>
          <input
            id="t-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby="t-phone-note"
            className={inputCls}
          />
          <p id="t-phone-note" className="mt-1.5 text-xs text-faint">
            {booking.phoneWhatsAppNote}
          </p>
          {err(errors.phone)}
        </div>
        <div>
          <label htmlFor="t-date" className={labelCls}>
            {labels.pickupDate} *
          </label>
          <input
            id="t-date"
            name="pickupDate"
            type="date"
            min={todayIso}
            aria-invalid={!!errors.pickupDate}
            className={inputCls}
          />
          {err(errors.pickupDate)}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="t-notes" className={labelCls}>
          {labels.notes} <span className="font-normal text-faint">({booking.optional})</span>
        </label>
        <textarea
          id="t-notes"
          name="notes"
          rows={3}
          placeholder={labels.notesPlaceholder}
          className="w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-faint"
        />
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="consent" aria-invalid={!!errors.consent} className="mt-0.5 h-5 w-5 accent-accent" />
        <span>{booking.consent}</span>
      </label>
      {err(errors.consent)}

      <div className="mt-4">
        <ChallengeCheckbox
          labels={{ label: booking.challengeLabel, verified: booking.challengeVerified, error: booking.challengeError }}
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
              title: booking.throttleTitle,
              body: booking.throttleBody,
              countdown: booking.throttleCountdown,
              whatsapp: booking.whatsappFallback,
            }}
            retryAfterSeconds={retryAfter}
            whatsappHref={whatsappHref}
            onExpire={() => setRetryAfter(null)}
          />
        </div>
      )}

      {/* Price = per vehicle, resolved from the admin-configured rate matrix. */}
      <div className="mt-5 flex items-center justify-between rounded-xl border border-line bg-cream px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{labels.price}</div>
          <div className="mt-0.5 text-[12px] text-muted">{labels.priceNote}</div>
        </div>
        <span aria-live="polite" className="whitespace-nowrap text-[24px] font-extrabold text-ink tabular-nums">
          {rate ? formatMoney(rate.price, rate.currency) : <span className="text-[16px] font-bold text-muted">{labels.priceOnRequest}</span>}
        </span>
      </div>

      <button
        type="submit"
        disabled={status === "sending" || retryAfter !== null}
        className="mt-4 flex h-[52px] w-full items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60"
      >
        {status === "sending" ? booking.sending : labels.submit}
      </button>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-faint">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {booking.securityNote}
      </div>
    </form>
  );
}
