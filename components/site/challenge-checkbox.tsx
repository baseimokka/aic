"use client";

import { useEffect, useId, useRef, useState } from "react";

type ChallengeState = "idle" | "verifying" | "verified" | "failed";

/**
 * Accessible "I'm not a robot" challenge (Gap Closure §4): a native,
 * keyboard-operable checkbox that fetches a signed token from /api/challenge
 * and submits it via a hidden `challengeToken` input. Increment `resetSignal`
 * to force it back to unchecked (e.g. after the server rejects an expired token).
 */
export function ChallengeCheckbox({
  labels,
  error,
  resetSignal = 0,
}: {
  labels: { label: string; verified: string; error: string };
  error?: string;
  resetSignal?: number;
}) {
  const [state, setState] = useState<ChallengeState>("idle");
  const [token, setToken] = useState("");
  const id = useId();
  const errorId = `${id}-error`;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Reset when the parent bumps `resetSignal` (the server rejected an expired
  // token). Adjusted during render rather than in an effect: the component stays
  // mounted across a reset, and React's documented pattern for deriving state
  // from a changed prop avoids the extra render pass — and the brief flash of
  // the stale "verified" tick — that an effect would cause.
  const [prevResetSignal, setPrevResetSignal] = useState(resetSignal);
  if (resetSignal !== prevResetSignal) {
    setPrevResetSignal(resetSignal);
    setState("idle");
    setToken("");
  }

  async function onToggle(checked: boolean) {
    if (!checked) {
      setState("idle");
      setToken("");
      return;
    }
    setState("verifying");
    try {
      const res = await fetch("/api/challenge");
      if (!res.ok) throw new Error("challenge unavailable");
      const json = (await res.json()) as { token?: string };
      if (!mounted.current) return;
      if (json.token) {
        setToken(json.token);
        setState("verified");
      } else {
        setState("failed");
      }
    } catch {
      if (mounted.current) setState("failed");
    }
  }

  const message = state === "failed" ? labels.error : error;

  return (
    <div>
      <input type="hidden" name="challengeToken" value={token} readOnly />
      <label
        htmlFor={id}
        className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 ${
          message ? "border-danger" : "border-line-input"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={state === "verified" || state === "verifying"}
          disabled={state === "verifying"}
          onChange={(e) => onToggle(e.currentTarget.checked)}
          aria-invalid={!!message}
          aria-describedby={message ? errorId : undefined}
          className="h-5 w-5 shrink-0 accent-accent"
        />
        <span className="text-[13px] font-semibold text-ink">{labels.label}</span>
        <span aria-live="polite" className="ms-auto flex items-center gap-1.5 text-[13px] font-semibold text-success">
          {state === "verifying" && (
            <span aria-hidden className="text-faint">
              …
            </span>
          )}
          {state === "verified" && (
            <>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {labels.verified}
            </>
          )}
        </span>
      </label>
      {message && (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
