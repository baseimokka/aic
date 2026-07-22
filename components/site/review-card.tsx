import type { ReviewData } from "@/lib/db/queries";
import type { Locale } from "@/lib/i18n/config";
import { Stars } from "@/components/site/stars";

export interface ReviewCardLabels {
  /** e.g. "{rating} out of 5" — aria description for the star row. */
  ratingOutOf: string;
  /** e.g. "Travelled {date}". */
  travelledIn: string;
}

/**
 * One customer review — quiet, compact card matching the premium system.
 * The body renders verbatim in its original language: `lang` for hyphenation /
 * screen readers and `dir="auto"` so an Arabic review flows RTL inside any
 * page locale (§17 — reviews are never translated).
 */
export function ReviewCard({ review, locale, labels }: { review: ReviewData; locale: Locale; labels: ReviewCardLabels }) {
  const travelled = review.travelDate
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(review.travelDate)
    : null;
  const initials = review.customerName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <Stars value={review.rating} size={14} label={labels.ratingOutOf.replace("{rating}", String(review.rating))} />
        {travelled && (
          <figcaption className="text-xs text-faint">{labels.travelledIn.replace("{date}", travelled)}</figcaption>
        )}
      </div>
      <blockquote lang={review.language} dir="auto" className="mt-3 flex-1 text-[15px] leading-[1.7] text-ink-soft">
        &ldquo;{review.body}&rdquo;
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-line-soft pt-4">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold text-ink">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-ink">{review.customerName}</span>
          {review.customerCountry && <span className="block truncate text-xs text-faint">{review.customerCountry}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
