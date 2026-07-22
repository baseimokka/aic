"use client";

import { useEffect, useState } from "react";

/**
 * "Too many attempts" state (Gap Closure §5): announced once, with a visual
 * countdown mirroring the server's Retry-After and a WhatsApp fallback.
 * Digits stay LTR in RTL locales. Calls `onExpire` when the wait is over.
 */
export function ThrottleNotice({
  labels,
  retryAfterSeconds,
  whatsappHref,
  onExpire,
}: {
  labels: { title: string; body: string; countdown: string; whatsapp: string };
  retryAfterSeconds: number;
  whatsappHref: string;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  // No resync of `remaining` from the prop here: both call sites render this
  // conditionally on `retryAfter !== null` and block submitting while it is set,
  // so `retryAfterSeconds` cannot change while mounted — useState's initial
  // value is always current, and on expiry the component unmounts entirely.
  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = retryAfterSeconds - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        onExpire();
      } else {
        setRemaining(left);
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryAfterSeconds]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-4">
      <div className="flex items-start gap-3">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-danger)" strokeWidth={2} strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v5l3 3" />
        </svg>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-danger">{labels.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{labels.body}</p>
          <p className="mt-2 text-[13px] font-semibold text-ink">
            {labels.countdown}{" "}
            {/* updates every second — hidden from screen readers; the alert above announces the wait once */}
            <span dir="ltr" aria-hidden className="font-mono tabular-nums">
              {mm}:{ss}
            </span>
          </p>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-whatsapp px-4 text-[14px] font-bold text-white"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
            </svg>
            {labels.whatsapp}
          </a>
        </div>
      </div>
    </div>
  );
}
