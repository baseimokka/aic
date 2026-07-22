import type { ReactNode } from "react";

/**
 * Quick Facts — compact traveler essentials on the tour detail page (between
 * Overview and Highlights). Purely presentational: the page resolves labels
 * from the locale catalog and hides facts with no value before passing them in.
 */

export interface QuickFact {
  id: "duration" | "pickup" | "languages" | "cancellation" | "custom";
  /** Empty for a label-less custom fact — the row then renders value-only. */
  label: string;
  value: string;
}

const iconProps = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "var(--color-teal)",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONS: Record<QuickFact["id"], ReactNode> = {
  duration: (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  pickup: (
    <svg {...iconProps} aria-hidden>
      <path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9L16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  languages: (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18 13.5 13.5 0 0 1 0-18z" />
    </svg>
  ),
  cancellation: (
    <svg {...iconProps} aria-hidden>
      <path d="M12 3l7 3v6c0 4.4-3 8.2-7 9.5C8 20.2 5 16.4 5 12V6l7-3z" />
      <path d="M9.2 12.2l2 2 3.6-4" />
    </svg>
  ),
  custom: (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

export function TourQuickFacts({ heading, facts }: { heading: string; facts: QuickFact[] }) {
  if (facts.length === 0) return null;
  return (
    <>
      <h2 className="mt-8 font-sans text-xl font-bold text-ink">{heading}</h2>
      <dl className="mt-3.5 grid gap-3 sm:grid-cols-2">
        {facts.map((f, i) => (
          <div key={`${f.id}-${i}`} className="flex items-start gap-3 rounded-[14px] border border-line bg-white p-4">
            <span className="mt-0.5 shrink-0" aria-hidden>
              {ICONS[f.id]}
            </span>
            <div className="min-w-0">
              {f.label && <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{f.label}</dt>}
              <dd className={`text-sm font-semibold leading-snug text-ink ${f.label ? "mt-1" : "mt-0.5"}`}>{f.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </>
  );
}
