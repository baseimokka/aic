import type { Resource } from "@/lib/rbac/matrix";

/**
 * Manual Translation registry — the single source of truth for which content
 * types are translatable and which of their columns hold localized text.
 *
 * This is NOT machine translation. Every locale is authored by hand by a
 * Content Admin (§17). One config here drives validation, coverage, the editor
 * UI, and the database dispatch — so no logic is duplicated per language or
 * per content type. Field `name`s map 1:1 to the companion translation table
 * columns; base-table fields (pricing, order, images, …) are never here.
 */

export type TranslatableEntityType =
  | "tour"
  | "category"
  | "destination"
  | "testimonial"
  | "faq"
  | "homepage"
  | "heroBanner";

export type FieldKind = "text" | "textarea" | "list";

/** A single localized value: a string, a string list, or absent. */
export type FieldValue = string | string[] | null;
export type FieldValues = Record<string, FieldValue>;

export interface TranslatableField {
  /** Column name on the translation table (e.g. "title"). */
  name: string;
  label: string;
  kind: FieldKind;
  /** Max length (per item for lists). */
  max: number;
  /**
   * Required in EVERY locale — these are the NOT-NULL content columns, mirroring
   * the English source schema. Optional fields can always be deferred (partial
   * saves), which is what keeps manual translation incremental.
   */
  required: boolean;
  /**
   * NOT-NULL in the database but optional in the editor (e.g. tour itinerary):
   * an empty value is stored as "" rather than NULL so the row is valid.
   */
  notNull?: boolean;
  hint?: string;
}

export interface TranslatableEntityConfig {
  type: TranslatableEntityType;
  /** Singular label for UI ("Tour"). */
  label: string;
  /** RBAC resource that governs *viewing* this content (read gate). */
  rbacResource: Resource;
  /** The foreign-key column on the translation table ("tourId"). */
  parentIdField: string;
  fields: TranslatableField[];
}

const TEXT = (name: string, label: string, max: number, required = false): TranslatableField => ({
  name,
  label,
  kind: "text",
  max,
  required,
  notNull: required,
});

const AREA = (name: string, label: string, max: number, required = false): TranslatableField => ({
  name,
  label,
  kind: "textarea",
  max,
  required,
  notNull: required,
});

const LIST = (name: string, label: string, max: number, hint?: string): TranslatableField => ({
  name,
  label,
  kind: "list",
  max,
  required: false,
  hint,
});

export const TRANSLATABLE: Record<TranslatableEntityType, TranslatableEntityConfig> = {
  tour: {
    type: "tour",
    label: "Tour",
    rbacResource: "tours",
    parentIdField: "tourId",
    fields: [
      TEXT("title", "Title", 200, true),
      { ...TEXT("slug", "Slug", 80), hint: "Optional localized URL — leave blank to reuse the English slug." },
      AREA("overview", "Overview", 6000, true),
      LIST("highlights", "Highlights", 200, "Key selling points shown after the overview, in this language."),
      {
        ...AREA("itinerary", "Itinerary", 20_000),
        notNull: true,
        hint: "One day per line. Add optional detail after “::” — e.g. “Day 1 — Luxor temples :: Board at midday, then Karnak by dusk.”",
      },
      LIST("included", "Included", 200, "What the price covers, in this language."),
      LIST("excluded", "Excluded", 200, "What is not covered, in this language."),
      LIST("customFacts", "Custom facts", 200, "Manually written Quick Facts in this language — optional “Label :: Value” format, e.g. “Group size :: Max 8 guests”."),
      TEXT("seoTitle", "SEO title", 180),
      AREA("metaDescription", "SEO description", 320),
    ],
  },
  category: {
    type: "category",
    label: "Category",
    rbacResource: "categories",
    parentIdField: "categoryId",
    fields: [TEXT("name", "Name", 120, true), AREA("description", "Description", 2000)],
  },
  destination: {
    type: "destination",
    label: "Destination",
    rbacResource: "destinations",
    parentIdField: "destinationId",
    fields: [
      TEXT("name", "Name", 120, true),
      { ...TEXT("slug", "Slug", 80), hint: "Optional localized URL." },
      AREA("description", "Description", 4000),
      TEXT("seoTitle", "SEO title", 180),
      AREA("metaDescription", "SEO description", 320),
    ],
  },
  testimonial: {
    type: "testimonial",
    label: "Testimonial",
    rbacResource: "testimonials",
    parentIdField: "testimonialId",
    fields: [AREA("quote", "Quote", 2000, true)],
  },
  faq: {
    type: "faq",
    label: "FAQ",
    rbacResource: "faqs",
    parentIdField: "faqId",
    fields: [TEXT("question", "Question", 300, true), AREA("answer", "Answer", 4000, true)],
  },
  homepage: {
    type: "homepage",
    label: "Homepage section",
    rbacResource: "homepage",
    parentIdField: "sectionId",
    fields: [TEXT("heading", "Heading", 200), AREA("body", "Body", 4000), TEXT("ctaLabel", "CTA label", 80)],
  },
  heroBanner: {
    type: "heroBanner",
    label: "Hero banner",
    rbacResource: "heroBanners",
    parentIdField: "bannerId",
    fields: [
      TEXT("headline", "Headline", 160, true),
      TEXT("subheadline", "Subheadline", 300),
      TEXT("ctaLabel", "CTA label", 80),
    ],
  },
};

export function isTranslatableEntityType(v: string): v is TranslatableEntityType {
  return Object.prototype.hasOwnProperty.call(TRANSLATABLE, v);
}

export function entityConfig(type: TranslatableEntityType): TranslatableEntityConfig {
  return TRANSLATABLE[type];
}
