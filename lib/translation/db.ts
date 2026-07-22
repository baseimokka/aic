import { prisma } from "@/lib/db/client";
import type { Locale } from "@/lib/i18n/config";
import {
  entityConfig,
  type FieldValue,
  type FieldValues,
  type TranslatableEntityConfig,
  type TranslatableEntityType,
} from "./registry";

/**
 * The one place that touches the seven translation tables. A typed switch keeps
 * Prisma's model types intact (no `any`) while every caller stays generic:
 * reads normalise a row into FieldValues, writes map validated FieldValues back
 * onto the correct columns. Base-entity data is never touched here.
 */

function asFieldValue(v: unknown): FieldValue {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return typeof v === "string" ? v : null;
}

function pickValues(config: TranslatableEntityConfig, row: Record<string, unknown>): FieldValues {
  const out: FieldValues = {};
  for (const f of config.fields) out[f.name] = asFieldValue(row[f.name]);
  return out;
}

/** Coerce a validated value onto a NOT-NULL text column. */
const str = (v: FieldValue): string => (typeof v === "string" ? v : "");
/** Coerce onto a nullable text column (empty → NULL). */
const nul = (v: FieldValue): string | null => (typeof v === "string" && v.length > 0 ? v : null);
/** Coerce onto a String[] column. */
const arr = (v: FieldValue): string[] => (Array.isArray(v) ? v : []);

// ───────────────────────────── reads ─────────────────────────────

async function findRow(
  type: TranslatableEntityType,
  entityId: string,
  locale: Locale,
): Promise<Record<string, unknown> | null> {
  switch (type) {
    case "tour":
      return prisma.tourTranslation.findUnique({ where: { tourId_locale: { tourId: entityId, locale } } });
    case "category":
      return prisma.categoryTranslation.findUnique({ where: { categoryId_locale: { categoryId: entityId, locale } } });
    case "destination":
      return prisma.destinationTranslation.findUnique({
        where: { destinationId_locale: { destinationId: entityId, locale } },
      });
    case "testimonial":
      return prisma.testimonialTranslation.findUnique({
        where: { testimonialId_locale: { testimonialId: entityId, locale } },
      });
    case "faq":
      return prisma.faqTranslation.findUnique({ where: { faqId_locale: { faqId: entityId, locale } } });
    case "homepage":
      return prisma.homepageSectionTranslation.findUnique({
        where: { sectionId_locale: { sectionId: entityId, locale } },
      });
    case "heroBanner":
      return prisma.heroBannerTranslation.findUnique({ where: { bannerId_locale: { bannerId: entityId, locale } } });
  }
}

/** One locale's stored values, or null when no translation row exists. */
export async function readTranslation(
  type: TranslatableEntityType,
  entityId: string,
  locale: Locale,
): Promise<FieldValues | null> {
  const row = await findRow(type, entityId, locale);
  return row ? pickValues(entityConfig(type), row) : null;
}

async function findAllRows(
  type: TranslatableEntityType,
  entityId: string,
): Promise<Record<string, unknown>[]> {
  switch (type) {
    case "tour":
      return prisma.tourTranslation.findMany({ where: { tourId: entityId } });
    case "category":
      return prisma.categoryTranslation.findMany({ where: { categoryId: entityId } });
    case "destination":
      return prisma.destinationTranslation.findMany({ where: { destinationId: entityId } });
    case "testimonial":
      return prisma.testimonialTranslation.findMany({ where: { testimonialId: entityId } });
    case "faq":
      return prisma.faqTranslation.findMany({ where: { faqId: entityId } });
    case "homepage":
      return prisma.homepageSectionTranslation.findMany({ where: { sectionId: entityId } });
    case "heroBanner":
      return prisma.heroBannerTranslation.findMany({ where: { bannerId: entityId } });
  }
}

/** Every locale's values for one entity, keyed by locale (used for coverage). */
export async function loadEntityLocales(
  type: TranslatableEntityType,
  entityId: string,
): Promise<Record<string, FieldValues>> {
  const config = entityConfig(type);
  const rows = await findAllRows(type, entityId);
  const out: Record<string, FieldValues> = {};
  for (const row of rows) {
    const locale = typeof row.locale === "string" ? row.locale : null;
    if (locale) out[locale] = pickValues(config, row);
  }
  return out;
}

/**
 * For list pages: which locales have a translation row, per entity. One lean
 * query per content type (selects only the FK + locale).
 */
export async function loadListLocales(
  type: TranslatableEntityType,
  entityIds: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (entityIds.length === 0) return map;
  const fk = entityConfig(type).parentIdField;

  let rows: Record<string, unknown>[] = [];
  switch (type) {
    case "tour":
      rows = await prisma.tourTranslation.findMany({ where: { tourId: { in: entityIds } }, select: { tourId: true, locale: true } });
      break;
    case "category":
      rows = await prisma.categoryTranslation.findMany({ where: { categoryId: { in: entityIds } }, select: { categoryId: true, locale: true } });
      break;
    case "destination":
      rows = await prisma.destinationTranslation.findMany({ where: { destinationId: { in: entityIds } }, select: { destinationId: true, locale: true } });
      break;
    case "testimonial":
      rows = await prisma.testimonialTranslation.findMany({ where: { testimonialId: { in: entityIds } }, select: { testimonialId: true, locale: true } });
      break;
    case "faq":
      rows = await prisma.faqTranslation.findMany({ where: { faqId: { in: entityIds } }, select: { faqId: true, locale: true } });
      break;
    case "homepage":
      rows = await prisma.homepageSectionTranslation.findMany({ where: { sectionId: { in: entityIds } }, select: { sectionId: true, locale: true } });
      break;
    case "heroBanner":
      rows = await prisma.heroBannerTranslation.findMany({ where: { bannerId: { in: entityIds } }, select: { bannerId: true, locale: true } });
      break;
  }

  for (const row of rows) {
    const id = row[fk];
    const locale = row.locale;
    if (typeof id !== "string" || typeof locale !== "string") continue;
    const set = map.get(id) ?? new Set<string>();
    set.add(locale);
    map.set(id, set);
  }
  return map;
}

// ───────────────────────────── write ─────────────────────────────

export interface WriteResult {
  id: string;
  created: boolean;
}

/**
 * Upsert one locale's translation from already-validated values. Returns whether
 * a row was created (for CREATE vs UPDATE audit). Only the translation table is
 * written — never the base entity.
 */
export async function writeTranslation(
  type: TranslatableEntityType,
  entityId: string,
  locale: Locale,
  v: FieldValues,
): Promise<WriteResult> {
  switch (type) {
    case "tour": {
      const where = { tourId_locale: { tourId: entityId, locale } };
      const data = {
        title: str(v.title),
        overview: str(v.overview),
        itinerary: str(v.itinerary),
        highlights: arr(v.highlights),
        included: arr(v.included),
        excluded: arr(v.excluded),
        customFacts: arr(v.customFacts),
        seoTitle: nul(v.seoTitle),
        metaDescription: nul(v.metaDescription),
        slug: nul(v.slug),
      };
      const existing = await prisma.tourTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.tourTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.tourTranslation.create({ data: { tourId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
    case "category": {
      const where = { categoryId_locale: { categoryId: entityId, locale } };
      const data = { name: str(v.name), description: nul(v.description) };
      const existing = await prisma.categoryTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.categoryTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.categoryTranslation.create({ data: { categoryId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
    case "destination": {
      const where = { destinationId_locale: { destinationId: entityId, locale } };
      const data = {
        name: str(v.name),
        description: nul(v.description),
        seoTitle: nul(v.seoTitle),
        metaDescription: nul(v.metaDescription),
        slug: nul(v.slug),
      };
      const existing = await prisma.destinationTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.destinationTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.destinationTranslation.create({ data: { destinationId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
    case "testimonial": {
      const where = { testimonialId_locale: { testimonialId: entityId, locale } };
      const data = { quote: str(v.quote) };
      const existing = await prisma.testimonialTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.testimonialTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.testimonialTranslation.create({ data: { testimonialId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
    case "faq": {
      const where = { faqId_locale: { faqId: entityId, locale } };
      const data = { question: str(v.question), answer: str(v.answer) };
      const existing = await prisma.faqTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.faqTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.faqTranslation.create({ data: { faqId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
    case "homepage": {
      const where = { sectionId_locale: { sectionId: entityId, locale } };
      const data = { heading: nul(v.heading), body: nul(v.body), ctaLabel: nul(v.ctaLabel) };
      const existing = await prisma.homepageSectionTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.homepageSectionTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.homepageSectionTranslation.create({ data: { sectionId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
    case "heroBanner": {
      const where = { bannerId_locale: { bannerId: entityId, locale } };
      const data = { headline: str(v.headline), subheadline: nul(v.subheadline), ctaLabel: nul(v.ctaLabel) };
      const existing = await prisma.heroBannerTranslation.findUnique({ where, select: { id: true } });
      if (existing) {
        await prisma.heroBannerTranslation.update({ where, data });
        return { id: existing.id, created: false };
      }
      const row = await prisma.heroBannerTranslation.create({ data: { bannerId: entityId, locale, ...data } });
      return { id: row.id, created: true };
    }
  }
}

/** The Prisma model name used as the audit `resourceType` for a translation write. */
export function translationResourceType(type: TranslatableEntityType): string {
  const map: Record<TranslatableEntityType, string> = {
    tour: "TourTranslation",
    category: "CategoryTranslation",
    destination: "DestinationTranslation",
    testimonial: "TestimonialTranslation",
    faq: "FaqTranslation",
    homepage: "HomepageSectionTranslation",
    heroBanner: "HeroBannerTranslation",
  };
  return map[type];
}
