import { z } from "zod";
import { TOUR_GUIDE_LANGUAGE_CODES } from "@/lib/tours/labels";
import { currencySchema } from "@/lib/validation/lead";

/**
 * Shared Zod building blocks for CMS content editors (§10 — schemas are the
 * server boundary and shared with the client forms). English is the source
 * language; the other 6 locales are entered manually, per locale (§17).
 */

/** Empty/whitespace strings collapse to null so optional text stays clean. */
export const nullableText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable(),
  );

export const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

export const orderField = z.coerce.number().int().min(0).max(9999).default(0);
export const optionalSlug = z.string().trim().max(80).optional();

// ─────────────────────────── Category ───────────────────────────
export const categorySchema = z.object({
  name: requiredText("Name", 120),
  slug: optionalSlug,
  description: nullableText(2000),
  order: orderField,
});
export type CategoryInput = z.infer<typeof categorySchema>;

// ─────────────────────────── Destination ───────────────────────────
export const destinationSchema = z.object({
  name: requiredText("Name", 120),
  slug: optionalSlug,
  description: nullableText(4000),
  heroImagePath: nullableText(300),
  order: orderField,
  featured: z.boolean().default(false),
  seoTitle: nullableText(180),
  metaDescription: nullableText(320),
});
export type DestinationInput = z.infer<typeof destinationSchema>;

// ─────────────────────────── Testimonial ───────────────────────────
export const testimonialSchema = z.object({
  authorName: requiredText("Author name", 120),
  authorCountry: nullableText(80),
  quote: requiredText("Quote", 2000),
  avatarPath: nullableText(300),
  rating: z.coerce.number().int().min(1).max(5).nullable().default(5),
  order: orderField,
  featured: z.boolean().default(true),
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;

// ─────────────────────────── Review (admin-managed, V1) ───────────────────────────
/**
 * `travelDate`, when supplied, must be a real `YYYY-MM-DD` calendar date (what
 * an <input type="date"> produces) and not in the future — reviews describe
 * trips already taken. A one-day grace absorbs timezone skew.
 */
export function isValidPastDate(value: string | null | undefined): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.toISOString().slice(0, 10) !== value) return false; // rejects e.g. 2026-02-31
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return date.getTime() <= todayUtc + 24 * 60 * 60 * 1000;
}

export const reviewSchema = z.object({
  customerName: requiredText("Customer name", 120),
  customerCountry: nullableText(80),
  tourId: nullableText(40),
  rating: z.coerce.number().int().min(1, "Rating is required.").max(5),
  body: requiredText("Review text", 4000),
  travelDate: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().nullable().default(null),
    )
    .refine(isValidPastDate, "Choose a valid travel date, today or earlier."),
  language: z.enum(["en", "ar", "de", "ru", "tr", "fr", "it"]).default("en"),
  source: z.enum(["WEBSITE", "GOOGLE", "WHATSAPP", "EMAIL", "FACEBOOK", "OTHER"]).default("WEBSITE"),
  featured: z.boolean().default(false),
  visible: z.boolean().default(true),
  displayOrder: orderField,
});
export type ReviewInput = z.infer<typeof reviewSchema>;

// ─────────────────────────── FAQ (global or per-tour) ───────────────────────────
export const faqSchema = z.object({
  question: requiredText("Question", 300),
  answer: requiredText("Answer", 4000),
  tourId: nullableText(40),
  order: orderField,
});
export type FaqInput = z.infer<typeof faqSchema>;

// ─────────────────────────── Homepage section ───────────────────────────
export const homepageSectionSchema = z.object({
  heading: nullableText(200),
  body: nullableText(4000),
  ctaLabel: nullableText(80),
  enabled: z.boolean().default(true),
});
export type HomepageSectionInput = z.infer<typeof homepageSectionSchema>;

// ─────────────────────────── Hero banner ───────────────────────────
export const heroBannerSchema = z.object({
  headline: requiredText("Headline", 160),
  subheadline: nullableText(300),
  ctaLabel: nullableText(80),
  ctaUrl: nullableText(300),
  imagePath: requiredText("Image", 300),
  order: orderField,
  enabled: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  startsAt: nullableText(40),
  endsAt: nullableText(40),
});
export type HeroBannerInput = z.infer<typeof heroBannerSchema>;

// ─────────────────────────── Blog ───────────────────────────
export const blogCategorySchema = z.object({
  name: requiredText("Name", 120),
  slug: optionalSlug,
});
export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;

export const blogPostSchema = z.object({
  title: requiredText("Title", 200),
  slug: optionalSlug,
  categoryId: nullableText(40),
  excerpt: nullableText(500),
  body: requiredText("Body", 100_000),
  coverImagePath: nullableText(300),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  seoTitle: nullableText(180),
  metaDescription: nullableText(320),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;

// ─────────────────────────── Tour ───────────────────────────
export const tourStatusSchema = z.enum(["ACTIVE", "DISABLED", "ARCHIVED"]);

/** Empty/absent numeric input collapses to null (mirrors nullableText). */
const nullablePositiveNumber = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().positive("Discount must be greater than zero.").max(max).nullable(),
  );

export const tourSchema = z.object({
  // Basics
  title: requiredText("Title", 200),
  slug: optionalSlug,
  categoryId: nullableText(40),
  destinationId: nullableText(40),
  tourType: requiredText("Tour type", 80),
  durationDays: z.coerce.number().int().min(1, "At least 1 day.").max(365),
  basePrice: z.coerce.number().min(0, "Price can't be negative.").max(99_999_999),
  currency: currencySchema.default("USD"),
  // Discount (optional): FIXED = discounted price, PERCENT = % off. Dates are
  // "YYYY-MM-DD" strings like hero banner scheduling; empty = no bound.
  discountType: z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["FIXED", "PERCENT"]).nullable()).default(null),
  discountValue: nullablePositiveNumber(99_999_999).default(null),
  discountStartsAt: nullableText(40),
  discountEndsAt: nullableText(40),
  // Quick Facts — structured values; labels localize via the UI string
  // catalogs, so no per-tour translation rows are needed. Empty = hidden.
  pickupType: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["HOTEL_INCLUDED", "AIRPORT_AVAILABLE", "MEETING_POINT", "NOT_INCLUDED"]).nullable(),
  ).default(null),
  cancellationPolicy: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(["FREE_24H", "FREE_48H", "FREE_72H", "NON_REFUNDABLE"]).nullable(),
  ).default(null),
  guideLanguages: z.array(z.enum(TOUR_GUIDE_LANGUAGE_CODES)).max(TOUR_GUIDE_LANGUAGE_CODES.length).default([]),
  familyFriendly: z.boolean().default(false),
  coupleFriendly: z.boolean().default(false),
  soloFriendly: z.boolean().default(false),
  featured: z.boolean().default(false),
  popularityScore: z.coerce.number().int().min(0).max(100000).default(0),
  status: tourStatusSchema.default("ACTIVE"),
  // Content (English source)
  overview: requiredText("Overview", 6000),
  itinerary: nullableText(20_000),
  highlights: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  included: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  excluded: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  // Manually written Quick Facts ("Label :: Value" or plain text per entry).
  customFacts: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  // SEO
  seoTitle: nullableText(180),
  metaDescription: nullableText(320),
  ogImagePath: nullableText(300),
}).superRefine((t, ctx) => {
  // Cross-field discount rules — the discount must actually lower the price.
  if (!t.discountType) return;
  if (t.discountValue == null) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Enter a discount value." });
    return;
  }
  if (t.discountType === "PERCENT" && (t.discountValue < 1 || t.discountValue > 99)) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percent must be between 1 and 99." });
  }
  if (t.discountType === "FIXED" && t.discountValue >= t.basePrice) {
    ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Discounted price must be lower than the base price." });
  }
  if (t.discountStartsAt && t.discountEndsAt && t.discountEndsAt <= t.discountStartsAt) {
    ctx.addIssue({ code: "custom", path: ["discountEndsAt"], message: "Discount end date must be after the start date." });
  }
});
export type TourInput = z.infer<typeof tourSchema>;

// Nested tour collections (managed on the edit page once the tour exists).
export const tourImageSchema = z.object({
  path: requiredText("Image", 300),
  alt: requiredText("Alt text", 300),
});
export type TourImageInput = z.infer<typeof tourImageSchema>;

/** Adding several library assets to a gallery in one call. */
export const tourImagesSchema = z.array(tourImageSchema).min(1, "Select at least one image.").max(50);

export const tourFaqSchema = z.object({
  question: requiredText("Question", 300),
  answer: requiredText("Answer", 4000),
});
export type TourFaqInput = z.infer<typeof tourFaqSchema>;
