import type { ReviewData, ReviewSummary } from "@/lib/db/queries";
import type { Locale } from "@/lib/i18n/config";
import { Stars } from "@/components/site/stars";
import { ReviewCard, type ReviewCardLabels } from "@/components/site/review-card";
import { StaggerGroup } from "@/components/site/stagger-group";

export interface TourReviewsLabels extends ReviewCardLabels {
  title: string;
  /** "{count} review" / "{count} reviews" */
  countOne: string;
  countMany: string;
  /** "{count} stars" / "{count} star" — distribution row aria labels. */
  starMany: string;
  starOne: string;
}

const MAX_CARDS = 6;

/**
 * Tour-detail reviews section: compact rating summary beside a responsive card
 * grid. Callers render it only when reviews exist — with none, the section is
 * omitted entirely (never an empty shell).
 */
export function TourReviews({
  reviews,
  summary,
  locale,
  labels,
}: {
  reviews: ReviewData[];
  summary: ReviewSummary;
  locale: Locale;
  labels: TourReviewsLabels;
}) {
  const countLabel = (summary.count === 1 ? labels.countOne : labels.countMany).replace("{count}", String(summary.count));

  return (
    <section className="mt-16" aria-labelledby="tour-reviews-heading">
      <h2 id="tour-reviews-heading" className="font-serif text-2xl font-semibold text-ink">
        {labels.title}
      </h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
        {/* Summary — average, stars, count, per-star distribution */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-4xl font-semibold leading-none text-ink tabular-nums">
              {summary.average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-sm text-muted">/ 5</span>
          </div>
          <Stars
            value={summary.average}
            size={16}
            label={labels.ratingOutOf.replace("{rating}", String(summary.average))}
            className="mt-2"
          />
          <p className="mt-1.5 text-[13px] text-muted">{countLabel}</p>
          <ul className="mt-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.distribution[star - 1];
              const pct = summary.count > 0 ? (count / summary.count) * 100 : 0;
              const rowLabel = `${(star === 1 ? labels.starOne : labels.starMany).replace("{count}", String(star))}: ${count}`;
              return (
                <li key={star} className="flex items-center gap-2.5" aria-label={rowLabel}>
                  <span aria-hidden className="w-3 text-end text-xs font-semibold tabular-nums text-ink-soft">
                    {star}
                  </span>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="#F5A623" aria-hidden className="shrink-0">
                    <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
                  </svg>
                  <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-[#F5A623]" style={{ width: `${pct}%` }} />
                  </span>
                  <span aria-hidden className="w-5 text-end text-xs tabular-nums text-faint">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Cards — single column on mobile, two on desktop (§14 mobile-first) */}
        <StaggerGroup className="grid gap-5 md:grid-cols-2">
          {reviews.slice(0, MAX_CARDS).map((r) => (
            <ReviewCard key={r.id} review={r} locale={locale} labels={labels} />
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
