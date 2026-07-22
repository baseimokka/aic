import { Prisma, type CancellationPolicy, type PickupType, type ReviewSource } from "@prisma/client";
import { prisma } from "./client";
import { getDictionary, tourTypeLabel } from "@/lib/i18n/dictionaries";
import { resolveTranslation } from "./locale";
import { resolvePricing, type ResolvedPricing } from "@/lib/pricing";
import type { Locale } from "@/lib/i18n/config";

// Fetch the requested locale's translation row plus the English fallback row.
const trFilter = (locale: Locale) => ({ where: { locale: { in: [locale, "en"] as Locale[] } } });

// ─────────────────────────── Tours ───────────────────────────
type TourRow = Prisma.TourGetPayload<{
  include: {
    translations: true;
    images: true;
    destination: { include: { translations: true } };
  };
}>;

export interface TourCardData {
  slug: string;
  title: string;
  overview: string;
  durationDays: number;
  basePrice: number;
  /** Per-person price after any active discount (equals basePrice when none). */
  effectivePrice: number;
  /** Rounded % saved when a discount is active, else null. */
  discountPercent: number | null;
  currency: string;
  tourType: string;
  imagePath: string | null;
  imagePaths: string[];
  destination: string | null;
  featured: boolean;
  /** Average of visible reviews (1 decimal), null when the tour has none. */
  ratingAvg: number | null;
  /** Count of visible reviews (0 when none). */
  ratingCount: number;
}

/** Visible-review aggregates per tour, one groupBy for a whole card list. */
async function reviewStatsFor(tourIds: string[]): Promise<Map<string, { avg: number; count: number }>> {
  const map = new Map<string, { avg: number; count: number }>();
  if (tourIds.length === 0) return map;
  const grouped = await prisma.review.groupBy({
    by: ["tourId"],
    where: { tourId: { in: tourIds }, visible: true, archivedAt: null },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const g of grouped) {
    if (g.tourId && g._avg.rating != null) {
      map.set(g.tourId, { avg: Math.round(g._avg.rating * 10) / 10, count: g._count._all });
    }
  }
  return map;
}

/** Decimal columns → the shared discount resolver (single source of truth). */
function pricingOf(t: {
  basePrice: Prisma.Decimal;
  discountType: "FIXED" | "PERCENT" | null;
  discountValue: Prisma.Decimal | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
}): ResolvedPricing {
  return resolvePricing({
    basePrice: Number(t.basePrice),
    discountType: t.discountType,
    discountValue: t.discountValue == null ? null : Number(t.discountValue),
    discountStartsAt: t.discountStartsAt,
    discountEndsAt: t.discountEndsAt,
  });
}

function toTourCard(t: TourRow, locale: Locale, reviewStats?: Map<string, { avg: number; count: number }>): TourCardData {
  const tr = resolveTranslation(t.translations, locale);
  const dtr = t.destination ? resolveTranslation(t.destination.translations, locale) : undefined;
  const pricing = pricingOf(t);
  const stats = reviewStats?.get(t.id);
  return {
    slug: t.slug,
    title: tr?.title ?? t.slug,
    overview: tr?.overview ?? "",
    durationDays: t.durationDays,
    basePrice: pricing.basePrice,
    effectivePrice: pricing.effectivePrice,
    discountPercent: pricing.discountPercent,
    currency: t.currency,
    tourType: t.tourType,
    imagePath: t.images[0]?.path ?? null,
    imagePaths: t.images.map((i) => i.path),
    destination: dtr?.name ?? null,
    featured: t.featured,
    ratingAvg: stats?.avg ?? null,
    ratingCount: stats?.count ?? 0,
  };
}

const tourInclude = (locale: Locale) => ({
  translations: trFilter(locale),
  images: { orderBy: { sortOrder: "asc" as const }, take: 6 },
  destination: { include: { translations: trFilter(locale) } },
});

export async function getFeaturedTours(locale: Locale, take = 6): Promise<TourCardData[]> {
  const rows = await prisma.tour.findMany({
    where: { status: "ACTIVE", archivedAt: null, featured: true },
    orderBy: { popularityScore: "desc" },
    take,
    include: tourInclude(locale),
  });
  const stats = await reviewStatsFor(rows.map((r) => r.id));
  return rows.map((r) => toTourCard(r, locale, stats));
}

export async function getAllTours(locale: Locale): Promise<TourCardData[]> {
  const rows = await prisma.tour.findMany({
    where: { status: "ACTIVE", archivedAt: null },
    orderBy: [{ featured: "desc" }, { popularityScore: "desc" }],
    include: tourInclude(locale),
  });
  const stats = await reviewStatsFor(rows.map((r) => r.id));
  return rows.map((r) => toTourCard(r, locale, stats));
}

// ─────────────────────────── Categories ───────────────────────────
export interface CategoryCardData {
  slug: string;
  name: string;
  description: string | null;
}

export async function getCategories(locale: Locale): Promise<CategoryCardData[]> {
  const rows = await prisma.category.findMany({
    where: { archivedAt: null },
    orderBy: { order: "asc" },
    include: { translations: trFilter(locale) },
  });
  return rows.map((c) => {
    const tr = resolveTranslation(c.translations, locale);
    return { slug: c.slug, name: tr?.name ?? c.slug, description: tr?.description ?? null };
  });
}

/**
 * Categories for the header "Tours" dropdown — lean by design (slug + name
 * only, no descriptions), and offering only categories that can actually show
 * results: non-archived with at least one ACTIVE, non-archived tour (same rule
 * as getFilterOptions). Runs once per request from the site layout's header.
 */
export async function getNavCategories(locale: Locale): Promise<{ slug: string; name: string }[]> {
  const rows = await prisma.category.findMany({
    where: { archivedAt: null, tours: { some: { status: "ACTIVE", archivedAt: null } } },
    orderBy: { order: "asc" },
    select: { slug: true, translations: trFilter(locale) },
  });
  return rows.map((c) => ({ slug: c.slug, name: resolveTranslation(c.translations, locale)?.name ?? c.slug }));
}

// ─────────────────────────── Destinations ───────────────────────────
export interface DestinationCardData {
  slug: string;
  name: string;
  description: string | null;
  imagePath: string | null;
}

export async function getDestinations(locale: Locale, onlyFeatured = false): Promise<DestinationCardData[]> {
  const rows = await prisma.destination.findMany({
    where: { archivedAt: null, ...(onlyFeatured ? { featured: true } : {}) },
    orderBy: { order: "asc" },
    include: { translations: trFilter(locale) },
  });
  return rows.map((d) => {
    const tr = resolveTranslation(d.translations, locale);
    return { slug: d.slug, name: tr?.name ?? d.slug, description: tr?.description ?? null, imagePath: d.heroImagePath };
  });
}

// ─────────────────────────── Testimonials ───────────────────────────
export interface TestimonialData {
  authorName: string;
  authorCountry: string | null;
  quote: string;
  rating: number | null;
}

export async function getTestimonials(locale: Locale): Promise<TestimonialData[]> {
  const rows = await prisma.testimonial.findMany({
    where: { archivedAt: null, featured: true },
    orderBy: { order: "asc" },
    include: { translations: trFilter(locale) },
  });
  return rows.map((x) => {
    const tr = resolveTranslation(x.translations, locale);
    return { authorName: x.authorName, authorCountry: x.authorCountry, quote: tr?.quote ?? "", rating: x.rating };
  });
}

// ─────────────────────────── Reviews (admin-managed, V1) ───────────────────────────
export interface ReviewData {
  id: string;
  customerName: string;
  customerCountry: string | null;
  rating: number;
  body: string;
  /** Trip month/year, formatted per-locale at render time. */
  travelDate: Date | null;
  /** The language the review was written in — displayed verbatim, never translated. */
  language: Locale;
  source: ReviewSource;
  featured: boolean;
  createdAt: Date;
}

const reviewSelect = {
  id: true,
  customerName: true,
  customerCountry: true,
  rating: true,
  body: true,
  travelDate: true,
  language: true,
  source: true,
  featured: true,
  createdAt: true,
} as const;

/**
 * Visible reviews for a tour, curated order: featured first, then manual
 * displayOrder, newest last-resort. Review text renders in its own language.
 */
export async function getTourReviews(tourId: string): Promise<ReviewData[]> {
  return prisma.review.findMany({
    where: { tourId, visible: true, archivedAt: null },
    orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
    select: reviewSelect,
  });
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Count per star, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
}

/** Aggregate a fetched review list — one place for the rounding rule. */
export function summarizeReviews(reviews: readonly Pick<ReviewData, "rating">[]): ReviewSummary | null {
  if (reviews.length === 0) return null;
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of reviews) {
    sum += r.rating;
    distribution[Math.min(4, Math.max(0, r.rating - 1))] += 1;
  }
  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution,
  };
}

// ─────────────────────────── Hero banners ───────────────────────────
export interface HeroSlideData {
  imagePath: string;
  headline: string;
  subheadline: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  showSearch: boolean;
}

export async function getHeroBanners(locale: Locale): Promise<HeroSlideData[]> {
  const now = new Date();
  const rows = await prisma.heroBanner.findMany({
    where: {
      enabled: true,
      archivedAt: null,
      // Honor the optional scheduling window (startsAt…endsAt).
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { order: "asc" },
    include: { translations: trFilter(locale) },
  });
  return rows.map((b) => {
    const tr = resolveTranslation(b.translations, locale);
    return {
      imagePath: b.imagePath,
      headline: tr?.headline ?? "",
      subheadline: tr?.subheadline ?? null,
      ctaLabel: tr?.ctaLabel ?? null,
      ctaUrl: b.ctaUrl,
      showSearch: b.showSearch,
    };
  });
}

// ─────────────────────────── Homepage sections ───────────────────────────
export interface SectionCopy {
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
}

/** Map of section `key` → localized copy, for enabled sections. */
export async function getHomepageSections(locale: Locale): Promise<Record<string, SectionCopy>> {
  const rows = await prisma.homepageSection.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    include: { translations: trFilter(locale) },
  });
  const map: Record<string, SectionCopy> = {};
  for (const s of rows) {
    const tr = resolveTranslation(s.translations, locale);
    map[s.key] = { heading: tr?.heading ?? null, body: tr?.body ?? null, ctaLabel: tr?.ctaLabel ?? null };
  }
  return map;
}

// ─────────────────────────── Global FAQ (site-wide, tourId = null) ───────────────────────────
export interface FaqItem {
  question: string;
  answer: string;
}

/** Site-wide FAQ entries for the public /faq page, locale-resolved with en fallback. */
export async function getGlobalFaqs(locale: Locale): Promise<FaqItem[]> {
  const rows = await prisma.faq.findMany({
    where: { tourId: null, archivedAt: null },
    orderBy: { order: "asc" },
    include: { translations: trFilter(locale) },
  });
  return rows
    .map((f) => {
      const tr = resolveTranslation(f.translations, locale);
      return { question: tr?.question ?? "", answer: tr?.answer ?? "" };
    })
    .filter((f) => f.question && f.answer);
}

// ─────────────────────────── Catalog: search + filter ───────────────────────────
export interface TourFilterParams {
  q?: string;
  category?: string;
  destination?: string;
  tourType?: string;
  duration?: string; // "1" | "2-3" | "4-7" | "8+"
  priceMin?: number;
  priceMax?: number;
  family?: boolean;
  couple?: boolean;
  solo?: boolean;
  sort?: string; // featured | popular | price-asc | price-desc | duration
  page?: number; // 1-based; when omitted, all matches are returned
  pageSize?: number; // when omitted, no LIMIT is applied
}

function durationWhere(duration?: string): Prisma.IntFilter | undefined {
  switch (duration) {
    case "1":
      return { equals: 1 };
    case "2-3":
      return { gte: 2, lte: 3 };
    case "4-7":
      return { gte: 4, lte: 7 };
    case "8+":
      return { gte: 8 };
    default:
      return undefined;
  }
}

// Price sorts pre-order by basePrice in the DB, then are re-sorted in JS on the
// *effective* (possibly discounted) price — the discount window is computed per
// row, so the DB can't order on it directly.
function sortOrder(sort?: string): Prisma.TourOrderByWithRelationInput[] {
  switch (sort) {
    case "popular":
      return [{ popularityScore: "desc" }];
    case "price-asc":
      return [{ basePrice: "asc" }];
    case "price-desc":
      return [{ basePrice: "desc" }];
    case "duration":
      return [{ durationDays: "asc" }];
    default:
      return [{ featured: "desc" }, { popularityScore: "desc" }];
  }
}

export async function searchTours(
  locale: Locale,
  f: TourFilterParams,
): Promise<{ tours: TourCardData[]; total: number }> {
  const where: Prisma.TourWhereInput = { status: "ACTIVE", archivedAt: null };
  if (f.category) where.category = { slug: f.category };
  if (f.destination) where.destination = { slug: f.destination };
  if (f.tourType) where.tourType = f.tourType;
  if (f.family) where.familyFriendly = true;
  if (f.couple) where.coupleFriendly = true;
  if (f.solo) where.soloFriendly = true;
  const dur = durationWhere(f.duration);
  if (dur) where.durationDays = dur;
  if (f.q && f.q.trim()) {
    const q = f.q.trim();
    // Scope the search to the requested locale + en fallback, matching the read
    // path (trFilter) so results never surface tours whose *visible* title/name
    // doesn't contain the query. (CLAUDE.md §8: search is locale-aware with en fallback.)
    const locs = [locale, "en"] as Locale[];
    where.OR = [
      { translations: { some: { locale: { in: locs }, title: { contains: q, mode: "insensitive" } } } },
      { destination: { translations: { some: { locale: { in: locs }, name: { contains: q, mode: "insensitive" } } } } },
    ];
  }
  const orderBy = sortOrder(f.sort);
  // Price filtering, price sorting, and pagination all run in JS on the
  // *effective* price (base price minus any active discount). The catalog is
  // small (tens of tours), so fetching every match stays cheap and keeps the
  // discount rule in one place (resolvePricing) instead of duplicated in SQL.
  const rows = await prisma.tour.findMany({ where, orderBy, include: tourInclude(locale) });
  const stats = await reviewStatsFor(rows.map((r) => r.id));
  let cards = rows.map((r) => toTourCard(r, locale, stats));
  if (f.priceMin !== undefined) cards = cards.filter((c) => c.effectivePrice >= f.priceMin!);
  if (f.priceMax !== undefined) cards = cards.filter((c) => c.effectivePrice <= f.priceMax!);
  if (f.sort === "price-asc") cards.sort((a, b) => a.effectivePrice - b.effectivePrice);
  else if (f.sort === "price-desc") cards.sort((a, b) => b.effectivePrice - a.effectivePrice);
  const total = cards.length;
  if (f.pageSize && f.pageSize > 0) {
    const page = f.page && f.page > 0 ? f.page : 1;
    cards = cards.slice((page - 1) * f.pageSize, page * f.pageSize);
  }
  return { tours: cards, total };
}

export interface FilterOptions {
  categories: { slug: string; name: string }[];
  destinations: { slug: string; name: string }[];
  /** `value` is the raw Tour.tourType (used in the URL); `label` is localized for display. */
  tourTypes: { value: string; label: string }[];
  priceMin: number;
  priceMax: number;
}

export async function getFilterOptions(locale: Locale): Promise<FilterOptions> {
  // Offer every non-archived category and destination, so newly added ones
  // appear in the filter bar immediately (even before a tour is attached);
  // an empty selection renders the catalog's no-results state cleanly.
  const [cats, dests, types, priceRows] = await Promise.all([
    prisma.category.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      include: { translations: trFilter(locale) },
    }),
    prisma.destination.findMany({
      where: { archivedAt: null },
      orderBy: { order: "asc" },
      include: { translations: trFilter(locale) },
    }),
    prisma.tour.findMany({
      where: { status: "ACTIVE", archivedAt: null },
      distinct: ["tourType"],
      select: { tourType: true },
      orderBy: { tourType: "asc" },
    }),
    // Slider bounds reflect what customers actually pay, so min/max run over
    // the effective (discounted) price — computed per row, not aggregable in SQL.
    prisma.tour.findMany({
      where: { status: "ACTIVE", archivedAt: null },
      select: { basePrice: true, discountType: true, discountValue: true, discountStartsAt: true, discountEndsAt: true },
    }),
  ]);
  const prices = priceRows.map((t) => pricingOf(t).effectivePrice);
  const dict = getDictionary(locale);
  return {
    categories: cats.map((c) => ({ slug: c.slug, name: resolveTranslation(c.translations, locale)?.name ?? c.slug })),
    destinations: dests.map((d) => ({ slug: d.slug, name: resolveTranslation(d.translations, locale)?.name ?? d.slug })),
    tourTypes: types.map((x) => ({ value: x.tourType, label: tourTypeLabel(dict, x.tourType) })),
    priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 0,
  };
}

// ─────────────────────────── Tour detail ───────────────────────────
export interface TourDetailData {
  id: string;
  slug: string;
  title: string;
  overview: string;
  itinerary: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  /** Manually written Quick Facts — raw "Label :: Value" / plain-text entries. */
  customFacts: string[];
  images: { path: string; alt: string }[];
  durationDays: number;
  basePrice: number;
  /** Per-person price after any active discount (equals basePrice when none). */
  effectivePrice: number;
  /** Rounded % saved when a discount is active, else null. */
  discountPercent: number | null;
  /** When a discount is active and time-boxed, its end date (for JSON-LD priceValidUntil). */
  discountEndsAt: Date | null;
  currency: string;
  tourType: string;
  /** Quick Facts — enum values (labels come from the UI catalog); null/empty hides the fact. */
  pickupType: PickupType | null;
  cancellationPolicy: CancellationPolicy | null;
  /** ISO 639-1 codes; rendered per locale via Intl.DisplayNames. */
  guideLanguages: string[];
  suitability: { family: boolean; couple: boolean; solo: boolean };
  category: { slug: string; name: string } | null;
  destination: { slug: string; name: string } | null;
  faqs: { question: string; answer: string }[];
  seoTitle: string | null;
  metaDescription: string | null;
  categoryId: string | null;
}

export async function getTourBySlug(locale: Locale, slug: string): Promise<TourDetailData | null> {
  const tour = await prisma.tour.findFirst({
    where: { slug, status: "ACTIVE", archivedAt: null },
    include: {
      translations: trFilter(locale),
      images: { orderBy: { sortOrder: "asc" } },
      category: { include: { translations: trFilter(locale) } },
      destination: { include: { translations: trFilter(locale) } },
      faqs: { where: { archivedAt: null }, orderBy: { order: "asc" }, include: { translations: trFilter(locale) } },
    },
  });
  if (!tour) return null;

  const tr = resolveTranslation(tour.translations, locale);
  const ctr = tour.category ? resolveTranslation(tour.category.translations, locale) : undefined;
  const dtr = tour.destination ? resolveTranslation(tour.destination.translations, locale) : undefined;

  const pricing = pricingOf(tour);

  return {
    id: tour.id,
    slug: tour.slug,
    title: tr?.title ?? tour.slug,
    overview: tr?.overview ?? "",
    itinerary: tr?.itinerary ?? "",
    highlights: tr?.highlights ?? [],
    included: tr?.included ?? [],
    excluded: tr?.excluded ?? [],
    customFacts: tr?.customFacts ?? [],
    images: tour.images.map((i) => ({ path: i.path, alt: i.alt })),
    durationDays: tour.durationDays,
    basePrice: pricing.basePrice,
    effectivePrice: pricing.effectivePrice,
    discountPercent: pricing.discountPercent,
    discountEndsAt: pricing.discountPercent != null ? tour.discountEndsAt : null,
    currency: tour.currency,
    tourType: tour.tourType,
    pickupType: tour.pickupType,
    cancellationPolicy: tour.cancellationPolicy,
    guideLanguages: tour.guideLanguages,
    suitability: { family: tour.familyFriendly, couple: tour.coupleFriendly, solo: tour.soloFriendly },
    category: tour.category && ctr ? { slug: tour.category.slug, name: ctr.name } : null,
    destination: tour.destination && dtr ? { slug: tour.destination.slug, name: dtr.name } : null,
    faqs: tour.faqs
      .map((f) => {
        const ftr = resolveTranslation(f.translations, locale);
        return { question: ftr?.question ?? "", answer: ftr?.answer ?? "" };
      })
      .filter((f) => f.question),
    seoTitle: tr?.seoTitle ?? null,
    metaDescription: tr?.metaDescription ?? null,
    categoryId: tour.categoryId,
  };
}

export async function getRelatedTours(
  locale: Locale,
  categoryId: string | null,
  excludeSlug: string,
  take = 3,
): Promise<TourCardData[]> {
  const rows = await prisma.tour.findMany({
    where: {
      status: "ACTIVE",
      archivedAt: null,
      slug: { not: excludeSlug },
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { popularityScore: "desc" },
    take,
    include: tourInclude(locale),
  });
  const stats = await reviewStatsFor(rows.map((r) => r.id));
  return rows.map((r) => toTourCard(r, locale, stats));
}

/** Active tour slugs for static generation of detail pages. */
export async function getTourSlugs(): Promise<string[]> {
  const rows = await prisma.tour.findMany({
    where: { status: "ACTIVE", archivedAt: null },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
