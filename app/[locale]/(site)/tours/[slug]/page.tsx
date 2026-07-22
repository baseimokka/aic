import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, tourTypeLabel } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { getTourBySlug, getRelatedTours, getTourSlugs, getTourReviews, summarizeReviews } from "@/lib/db/queries";
import { SITE_URL, localizedAlternates } from "@/lib/seo";
import { TourCard } from "@/components/site/tour-card";
import { StaggerGroup } from "@/components/site/stagger-group";
import { TourGallery } from "@/components/site/tour-gallery";
import { TourBooking } from "@/components/site/tour-booking";
import { TourQuickFacts, type QuickFact } from "@/components/site/quick-facts";
import { TourReviews } from "@/components/site/tour-reviews";
import { languageNames } from "@/lib/i18n/languages";
import { formatDayCount } from "@/lib/i18n/plural";

// Hourly ISR so scheduled discount windows (start/end dates) flip on static
// pages without an admin save; admin edits still revalidate immediately.
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getTourSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const tour = await getTourBySlug(locale, slug);
  if (!tour) return { title: "Tour" };
  return {
    title: tour.seoTitle ?? tour.title,
    description: tour.metaDescription ?? tour.overview.slice(0, 155),
    alternates: localizedAlternates(locale, `/tours/${slug}`),
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const d = t.detail;

  const tour = await getTourBySlug(locale, slug);
  if (!tour) notFound();

  const [related, reviews] = await Promise.all([
    getRelatedTours(locale, tour.categoryId, tour.slug, 3),
    getTourReviews(tour.id),
  ]);
  const reviewSummary = summarizeReviews(reviews);

  const tourLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tour.title,
    description: tour.overview,
    offers: {
      "@type": "Offer",
      // What the customer actually pays (any active discount applied).
      price: tour.effectivePrice,
      priceCurrency: tour.currency,
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/${locale}/tours/${tour.slug}`,
      ...(tour.discountEndsAt ? { priceValidUntil: tour.discountEndsAt.toISOString().slice(0, 10) } : {}),
    },
    // Rating markup only when genuine reviews exist — never an empty shell.
    ...(reviewSummary
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.average,
            reviewCount: reviewSummary.count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.customerName },
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            reviewBody: r.body,
            inLanguage: r.language,
            datePublished: r.createdAt.toISOString().slice(0, 10),
          })),
        }
      : {}),
  };

  const suitabilityChips = [
    tour.suitability.family && t.catalog.family,
    tour.suitability.couple && t.catalog.couple,
    tour.suitability.solo && t.catalog.solo,
  ].filter(Boolean) as string[];

  // Day-by-day itinerary: one day per line; optional per-day detail after "::".
  // The leading "Day N —" / Arabic label is dropped (the numbered badge shows it).
  const days = tour.itinerary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const stripped = line.replace(/^(Days?|اليوم(?:ان)?|الأيام)\s*[\d٠-٩\s.,–—-]*[—–-]\s*/i, "");
      const sep = stripped.indexOf("::");
      const title = (sep >= 0 ? stripped.slice(0, sep) : stripped).trim();
      const details = sep >= 0 ? stripped.slice(sep + 2).trim() : "";
      return { title, details };
    });

  // Quick Facts — only facts with a value render (empty → hidden, §UX).
  const guideLangs = languageNames(tour.guideLanguages, locale).join(" • ");
  const quickFacts: QuickFact[] = [{ id: "duration", label: d.duration, value: formatDayCount(tour.durationDays, locale, d) }];
  if (tour.pickupType) quickFacts.push({ id: "pickup", label: d.pickup, value: d.pickupOptions[tour.pickupType] });
  if (guideLangs) quickFacts.push({ id: "languages", label: d.languages, value: guideLangs });
  if (tour.cancellationPolicy)
    quickFacts.push({ id: "cancellation", label: d.cancellation, value: d.cancellationOptions[tour.cancellationPolicy] });
  // Manually written facts — "Label :: Value" per entry (same "::" convention
  // as the itinerary); an entry without "::" renders as a value-only card.
  for (const raw of tour.customFacts) {
    const sep = raw.indexOf("::");
    const label = sep >= 0 ? raw.slice(0, sep).trim() : "";
    const value = (sep >= 0 ? raw.slice(sep + 2) : raw).trim();
    if (value) quickFacts.push({ id: "custom", label, value });
    else if (label) quickFacts.push({ id: "custom", label: "", value: label }); // "Label ::" with nothing after
  }

  const whatsappHref = `https://wa.me/201221416299?text=${encodeURIComponent(tour.title)}`;
  const priceLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: tour.currency,
    minimumFractionDigits: 0,
  }).format(tour.effectivePrice);
  const stickyLabels = {
    from: d.from,
    perPerson: d.perPerson,
    originalPrice: d.originalPrice,
    percentOff: d.percentOff,
    adults: t.booking.adults,
    children: t.booking.children,
    decrease: t.booking.decrease,
    increase: t.booking.increase,
    requestBooking: t.actions.requestBooking,
    whatsapp: t.actions.contactWhatsApp,
    noPayment: d.noPayment,
  };

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tourLd) }} />

      {/* Breadcrumb */}
      <nav className="text-[13px] text-faint" aria-label="Breadcrumb">
        <Link href={`/${locale}`} className="text-muted hover:text-ink">
          {t.nav.home}
        </Link>{" "}
        /{" "}
        <Link href={`/${locale}/tours`} className="text-muted hover:text-ink">
          {t.nav.tours}
        </Link>{" "}
        / <span className="font-semibold text-ink">{tour.title}</span>
      </nav>

      {/* Gallery */}
      <TourGallery images={tour.images} labels={d.gallery} />

      <TourBooking
        effectivePrice={tour.effectivePrice}
        originalPrice={tour.discountPercent != null ? tour.basePrice : null}
        discountPercent={tour.discountPercent}
        currency={tour.currency}
        priceLabel={priceLabel}
        whatsappHref={whatsappHref}
        tourSlug={tour.slug}
        tourTitle={tour.title}
        locale={locale}
        stickyLabels={stickyLabels}
        bookingLabels={t.booking}
      >
        {/* Content (left column) */}
        <div>
          <div className="flex flex-wrap gap-2">
            {tour.category && (
              <span className="rounded-full bg-teal-soft px-3 py-1.5 text-xs font-bold text-teal">{tour.category.name}</span>
            )}
            {suitabilityChips.map((s) => (
              <span key={s} className="rounded-full bg-warning-soft px-3 py-1.5 text-xs font-bold text-[color:var(--color-warning)]">
                {s}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-balance font-serif text-[36px] font-semibold leading-tight text-ink">{tour.title}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[color:var(--color-ink-soft)]">
            {tour.destination && (
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6E6A80" strokeWidth={1.8} aria-hidden>
                  <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {tour.destination.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6E6A80" strokeWidth={1.8} aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              {formatDayCount(tour.durationDays, locale, d)}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-ink">{tourTypeLabel(t, tour.tourType)}</span>
          </div>

          {/* Overview */}
          <h2 className="mt-8 font-sans text-xl font-bold text-ink">{d.overview}</h2>
          <p className="mt-2.5 max-w-3xl text-[15px] leading-[1.7] text-ink-soft">{tour.overview}</p>

          {/* Quick Facts */}
          <TourQuickFacts heading={d.quickFacts} facts={quickFacts} />

          {/* Highlights */}
          {tour.highlights.length > 0 && (
            <>
              <h2 className="mt-8 font-sans text-xl font-bold text-ink">{d.highlights}</h2>
              <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {tour.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink-soft">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-teal)" strokeWidth={2.6} className="mt-0.5 shrink-0" aria-hidden>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Day-by-day itinerary */}
          {days.length > 0 && (
            <>
              <h2 className="mt-8 font-sans text-xl font-bold text-ink">{d.itinerary}</h2>
              <div className="mt-3.5 overflow-hidden rounded-[14px] border border-line bg-white">
                {days.map((day, i) => {
                  const badge = (
                    <span
                      className={
                        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold " +
                        (i === 0 ? "bg-accent text-white" : "bg-surface-2 text-ink")
                      }
                    >
                      {i + 1}
                    </span>
                  );
                  const wrap = i > 0 ? "border-t border-line-soft" : "";
                  return day.details ? (
                    <details key={i} open={i === 0} className={"group " + wrap}>
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                        {badge}
                        <span className="flex-1 pt-1 font-semibold text-ink">{day.title}</span>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <p className="pb-4 pe-4 ps-[58px] text-sm leading-relaxed text-ink-soft">{day.details}</p>
                    </details>
                  ) : (
                    <div key={i} className={wrap}>
                      <div className="flex items-start gap-3 p-4">
                        {badge}
                        <p className="pt-1 text-sm font-semibold leading-relaxed text-ink">{day.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Included / Not included */}
          {(tour.included.length > 0 || tour.excluded.length > 0) && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {tour.included.length > 0 && (
                <div>
                  <h3 className="font-sans text-base font-bold text-ink">{d.included}</h3>
                  <ul className="mt-2.5 space-y-2">
                    {tour.included.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-soft">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-success)" strokeWidth={2.4} className="mt-0.5 shrink-0" aria-hidden>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tour.excluded.length > 0 && (
                <div>
                  <h3 className="font-sans text-base font-bold text-ink">{d.excluded}</h3>
                  <ul className="mt-2.5 space-y-2">
                    {tour.excluded.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-danger)" strokeWidth={2.4} className="mt-0.5 shrink-0" aria-hidden>
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* FAQ */}
          {tour.faqs.length > 0 && (
            <>
              <h2 className="mt-8 font-sans text-xl font-bold text-ink">{d.faq}</h2>
              <div className="mt-3">
                {tour.faqs.map((f, i) => (
                  <details key={i} className="group border-b border-line py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                      {f.question}
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </summary>
                    <p className="mt-2 leading-relaxed text-muted">{f.answer}</p>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      </TourBooking>

      {/* Reviews — near the bottom (§brief); fully omitted when the tour has none */}
      {reviewSummary && (
        <TourReviews
          reviews={reviews}
          summary={reviewSummary}
          locale={locale}
          labels={{
            title: t.reviews.title,
            countOne: t.reviews.countOne,
            countMany: t.reviews.countMany,
            ratingOutOf: t.reviews.ratingOutOf,
            travelledIn: t.reviews.travelledIn,
            starOne: t.reviews.starOne,
            starMany: t.reviews.starMany,
          }}
        />
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-semibold text-ink">{d.related}</h2>
          <StaggerGroup className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <TourCard key={r.slug} tour={r} locale={locale} />
            ))}
          </StaggerGroup>
        </section>
      )}
    </main>
  );
}
