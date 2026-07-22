"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { contactSchema } from "@/lib/validation/contact";
import { ChallengeCheckbox } from "@/components/site/challenge-checkbox";
import { ThrottleNotice } from "@/components/site/throttle-notice";

type Status = "idle" | "sending" | "success";

export function ContactForm({
  labels,
  whatsappHref,
  locale,
}: {
  labels: Dictionary["contact"];
  whatsappHref: string;
  locale: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [challengeReset, setChallengeReset] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // The shared Zod schema (§26) decides validity; messages come from the locale catalog.
  function localizeField(field: string): string {
    if (field === "email") return labels.invalidEmail;
    if (field === "consent") return labels.consentRequired;
    if (field === "challengeToken") return labels.challengeRequired;
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
      fullName: text("fullName"),
      email: text("email"),
      message: text("message"),
      consent: fd.get("consent") === "on",
      locale,
      challengeToken: String(fd.get("challengeToken") ?? ""),
    };

    const result = contactSchema.safeParse(payload);
    if (!result.success) {
      showFieldErrors(result.error.issues.map((i) => String(i.path[0] ?? "")));
      return;
    }
    setErrors({});
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (res.ok) {
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
      <div className="rounded-2xl border border-success/30 bg-success/10 p-8 text-center">
        <h3 className="font-serif text-xl font-semibold text-success-deep">{labels.successTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{labels.successBody}</p>
      </div>
    );
  }

  const inputCls =
    "h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 text-[15px] text-ink placeholder:text-faint focus-visible:border-accent";
  const err = (m?: string) =>
    m ? (
      <p className="mt-1 text-xs font-medium text-danger" role="alert">
        {m}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold text-ink">
            {labels.name}
          </label>
          <input id="c-name" name="fullName" autoComplete="name" aria-invalid={!!errors.fullName} className={inputCls} />
          {err(errors.fullName)}
        </div>
        <div>
          <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold text-ink">
            {labels.email}
          </label>
          <input id="c-email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={inputCls} />
          {err(errors.email)}
        </div>
      </div>

      <div>
        <label htmlFor="c-message" className="mb-1.5 block text-sm font-semibold text-ink">
          {labels.message}
        </label>
        <textarea
          id="c-message"
          name="message"
          rows={5}
          aria-invalid={!!errors.message}
          className="w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-faint"
        />
        {err(errors.message)}
      </div>

      <label className="flex items-start gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="consent" aria-invalid={!!errors.consent} className="mt-0.5 h-5 w-5 accent-accent" />
        <span>{labels.consent}</span>
      </label>
      {err(errors.consent)}

      <ChallengeCheckbox
        labels={{ label: labels.challengeLabel, verified: labels.challengeVerified, error: labels.challengeError }}
        error={errors.challengeToken}
        resetSignal={challengeReset}
      />

      {formError && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3.5 text-[13px] font-medium text-danger" role="alert">
          {formError}
        </p>
      )}

      {retryAfter !== null && (
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
      )}

      <button
        type="submit"
        disabled={status === "sending" || retryAfter !== null}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-60"
      >
        {status === "sending" ? labels.sending : labels.send}
      </button>
    </form>
  );
}
