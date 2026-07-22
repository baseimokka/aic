/**
 * Legacy aictravelDB (SQL Server) → Prisma/PostgreSQL migration.
 * Per docs/migration/phase2-migration-plan.md. Structured data only — no media.
 *
 * Modes (exactly one):
 *   --dry-run   transform + reconcile, ZERO writes; report shows what --import would do (default)
 *   --import    perform the migration (idempotent — re-runs update/skip, never duplicate)
 *   --verify    read-only post-import verification of counts, keys, and invariants
 *
 * Idempotency: deterministic matching via (1) the persistent legacy-id → cuid
 * map in docs/migration/idmap.phase2.json, then (2) natural keys (unique slugs,
 * vehicle name, FAQ English question). Runs are safe to repeat.
 *
 * Usage: npm run migrate:legacy -- --dry-run | --import | --verify
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient, Prisma, type Locale } from "@prisma/client";
import { TOUR_GUIDE_LANGUAGE_CODES } from "../../lib/tours/labels";
import {
  LegacyDb,
  LOCALE_MAP,
  EXCLUDED_TOUR_IDS,
  type LegacyTourDescription,
} from "./legacy";
import {
  trimCollapse,
  htmlToText,
  htmlToInline,
  htmlToList,
  slugify,
  parseDurationDays,
  buildItinerary,
  parsePickupType,
  parseCancellationPolicy,
  parseGuideLanguages,
  buildCustomFacts,
  parseDiscount,
  clamp,
} from "./transform";
import { MigrationReport, type Mode } from "./report";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const IDMAP_PATH = path.join(PROJECT_ROOT, "docs", "migration", "idmap.phase2.json");
const RUN_TIMESTAMP = new Date();

// ─────────────────────────── Plan constants (§4) ───────────────────────────

/** Legacy TourTypeId → Destination slug (plan §4.2). */
const DESTINATION_SLUGS: Record<number, string> = {
  2: "hurghada",
  3: "sharm-el-sheikh",
  4: "marsa-alam",
  5: "cairo",
};

/** Categories whose tours validly derive destination = Hurghada (plan §4.3). */
const HURGHADA_CATEGORY_IDS = new Set([4, 7, 8, 9]);
/** Aswan tours misfiled under Sea Trips — destination left null for manual review. */
const DESTINATION_REVIEW_TOUR_IDS = new Set([50, 51, 52]);

/** Proposed tourType vocabulary (plan §4.3): multi-day wins, then category. */
function deriveTourType(durationDays: number, categoryLegacyId: number): string {
  if (durationDays > 1) return "Multi-day";
  if (categoryLegacyId === 8) return "Diving";
  if (categoryLegacyId === 7) return "Safari";
  if (categoryLegacyId === 4) return "Sea trip";
  return "Day tour";
}

/** Vehicle normalization table (plan §4.7). Unknown fleet rows fall back to raw name. */
const VEHICLE_MAP: Record<number, { name: string; type: string }> = {
  1: { name: "Kia Sportage 2022", type: "car" },
  2: { name: "Mini Bus", type: "minibus" },
  3: { name: "Toyota HiAce 2024", type: "van" },
};

/** Locale-word strip for destination names ("Hurghada Tours" → "Hurghada"). */
const DEST_NAME_SUFFIX = /\s*(tours?|touren|туры|тур|ausflüge|excursions?)\s*$/i;

// ─────────────────────────── Field limits (mirrors lib/validation/content.ts) ───────────────────────────

const LIMITS = {
  slug: 80,
  title: 200,
  name: 120,
  overview: 6000,
  itinerary: 20_000,
  listItem: 200,
  listMax: 60,
  metaDescription: 320,
  categoryDescription: 2000,
  destinationDescription: 4000,
  faqQuestion: 300,
  faqAnswer: 4000,
  blogTitle: 200,
  blogExcerpt: 500,
  blogBody: 100_000,
} as const;

// ─────────────────────────── Id map ───────────────────────────

type IdMapSection = "destinations" | "categories" | "tours" | "faqs" | "blogPosts" | "vehicles";
type IdMap = Record<IdMapSection, Record<string, string>>;

function loadIdMap(): IdMap {
  const empty: IdMap = { destinations: {}, categories: {}, tours: {}, faqs: {}, blogPosts: {}, vehicles: {} };
  if (!fs.existsSync(IDMAP_PATH)) return empty;
  try {
    const parsed = JSON.parse(fs.readFileSync(IDMAP_PATH, "utf8")) as Partial<IdMap>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

function saveIdMap(map: IdMap): void {
  fs.mkdirSync(path.dirname(IDMAP_PATH), { recursive: true });
  fs.writeFileSync(IDMAP_PATH, `${JSON.stringify(map, null, 2)}\n`, "utf8");
}

// ─────────────────────────── .env loader (tsx does not load it) ───────────────────────────

function loadDotEnv(): void {
  const p = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

// ─────────────────────────── Built (transformed) shapes ───────────────────────────

interface BuiltTranslation {
  locale: Locale;
  name: string;
  description: string | null;
}

interface BuiltDestination {
  legacyId: number;
  slug: string;
  order: number;
  translations: BuiltTranslation[];
}

interface BuiltCategory {
  legacyId: number;
  slug: string;
  order: number;
  translations: BuiltTranslation[];
}

interface BuiltTourTranslation {
  locale: Locale;
  title: string;
  overview: string;
  itinerary: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  customFacts: string[];
  metaDescription: string | null;
}

interface BuiltTour {
  legacyId: number;
  slug: string;
  categoryLegacyId: number;
  destinationSlug: string | null; // null ⇒ manual review — never touched on update
  durationDays: number;
  basePrice: number;
  discountType: "FIXED" | null;
  discountValue: number | null;
  tourType: string;
  pickupType: "HOTEL_INCLUDED" | null;
  cancellationPolicy: "FREE_24H" | "FREE_48H" | "FREE_72H" | "NON_REFUNDABLE" | null;
  guideLanguages: string[];
  featured: boolean;
  status: "ACTIVE" | "DISABLED";
  translations: BuiltTourTranslation[];
}

interface BuiltFaq {
  legacyId: number;
  order: number;
  translations: { locale: Locale; question: string; answer: string }[];
}

interface BuiltBlogPost {
  legacyId: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
}

interface BuiltVehicle {
  legacyId: number;
  name: string;
  capacity: number;
  type: string;
}

// ─────────────────────────── Build phase (legacy → desired state) ───────────────────────────

async function buildAll(legacy: LegacyDb, report: MigrationReport) {
  const [
    tourTypes, tourTypeDescs, categories, categoryDescs,
    tours, tourDescs, faqs, faqDescs, blogs, blogDescs, fleet,
  ] = await Promise.all([
    legacy.tourTypes(), legacy.tourTypeDescriptions(),
    legacy.categories(), legacy.categoryDescriptions(),
    legacy.tours(), legacy.tourDescriptions(),
    legacy.faqs(), legacy.faqDescriptions(),
    legacy.blogs(), legacy.blogDescriptions(),
    legacy.fleet(),
  ]);

  // Destinations from O_TourType
  const builtDestinations: BuiltDestination[] = tourTypes.map((t) => {
    const slug = DESTINATION_SLUGS[t.TourTypeId] ?? slugify(trimCollapse(t.ReferenceName).replace(DEST_NAME_SUFFIX, ""));
    if (!DESTINATION_SLUGS[t.TourTypeId]) {
      report.warn("Destination", `legacy:${t.TourTypeId}`, `unexpected TourTypeId — derived slug "${slug}" from name`);
    }
    const translations: BuiltTranslation[] = tourTypeDescs
      .filter((d) => d.TourTypeId === t.TourTypeId)
      .map((d) => ({
        locale: LOCALE_MAP[d.LanguageId] as Locale,
        name: clampWarn(report, "DestinationTranslation", `legacy:${t.TourTypeId}/${LOCALE_MAP[d.LanguageId]}`,
          trimCollapse(d.Name).replace(DEST_NAME_SUFFIX, "") || trimCollapse(d.Name), LIMITS.name, "name"),
        description: nullable(clampWarn(report, "DestinationTranslation", `legacy:${t.TourTypeId}/${LOCALE_MAP[d.LanguageId]}`,
          htmlToText(d.Description), LIMITS.destinationDescription, "description")),
      }))
      .filter((tr) => tr.name.length > 0);
    return { legacyId: t.TourTypeId, slug, order: t.SortOrder, translations };
  });

  // Categories
  const builtCategories: BuiltCategory[] = categories.map((c) => {
    const enDesc = categoryDescs.find((d) => d.TourCategoryId === c.TourCategoryId && d.LanguageId === 1);
    let slug = slugify(enDesc?.PageUrl) || slugify(enDesc?.Name) || slugify(c.ReferenceName);
    const translations: BuiltTranslation[] = categoryDescs
      .filter((d) => d.TourCategoryId === c.TourCategoryId)
      .map((d) => ({
        locale: LOCALE_MAP[d.LanguageId] as Locale,
        name: clampWarn(report, "CategoryTranslation", `legacy:${c.TourCategoryId}/${LOCALE_MAP[d.LanguageId]}`,
          trimCollapse(d.Name), LIMITS.name, "name"),
        description: nullable(clampWarn(report, "CategoryTranslation", `legacy:${c.TourCategoryId}/${LOCALE_MAP[d.LanguageId]}`,
          htmlToText(d.Description), LIMITS.categoryDescription, "description")),
      }))
      .filter((tr) => tr.name.length > 0);
    return { legacyId: c.TourCategoryId, slug, order: c.SortOrder, translations };
  });
  assertUniqueSlugs(builtCategories, "Category", report);

  // Tours
  const descByTour = new Map<number, LegacyTourDescription[]>();
  for (const d of tourDescs) {
    const list = descByTour.get(d.TourId) ?? [];
    list.push(d);
    descByTour.set(d.TourId, list);
  }

  const builtTours: BuiltTour[] = [];
  for (const t of tours) {
    const key = `legacy:${t.TourId}`;
    const descs = descByTour.get(t.TourId) ?? [];
    const en = descs.find((d) => d.LanguageId === 1);
    if (!en) {
      report.error("Tour", key, "no English description row — cannot derive slug/content; tour not migrated");
      continue;
    }

    const slug = slugify(en.PageUrl) || slugify(en.Name);
    if (!slug) {
      report.error("Tour", key, "slug empty after normalization — tour not migrated");
      continue;
    }

    const { days, parsed } = parseDurationDays(en.Length);
    if (!parsed) report.warn("Tour", key, `unparseable Length "${trimCollapse(en.Length)}" — durationDays defaulted to 1`);

    const discount = parseDiscount(en.PriceBeforeDiscount, Number(t.Price));
    if (discount.note) report.warn("Tour", key, discount.note);

    const cancellation = parseCancellationPolicy(en.ChangesCancellations);
    const guideLangs = parseGuideLanguages(en.TourGuide, TOUR_GUIDE_LANGUAGE_CODES);
    const pickup = parsePickupType(en.PickUpPoint);

    // Destination derivation (plan §4.3 / approved decision 4)
    let destinationSlug: string | null = null;
    if (DESTINATION_REVIEW_TOUR_IDS.has(t.TourId)) {
      report.warn("Tour", key, "destination left null — Aswan tour misfiled under Sea Trips (manual review)");
    } else if (HURGHADA_CATEGORY_IDS.has(t.TourCategoryId)) {
      destinationSlug = "hurghada";
    } else {
      report.warn("Tour", key, `destination left null — category ${t.TourCategoryId} contradicts legacy chain (manual review)`);
    }

    const translations: BuiltTourTranslation[] = [];
    for (const d of descs) {
      const locale = LOCALE_MAP[d.LanguageId] as Locale;
      const trKey = `${key}/${locale}`;
      const title = clampWarn(report, "TourTranslation", trKey, trimCollapse(d.Name), LIMITS.title, "title");
      let overview = htmlToText(d.ShortDescription);
      if (!overview) {
        overview = htmlToText(d.Description);
        if (overview) report.warn("TourTranslation", trKey, "empty ShortDescription — overview taken from Description");
      }
      if (!overview) {
        report.warn("TourTranslation", trKey, "no usable overview text — translation row skipped");
        continue;
      }
      overview = clampWarn(report, "TourTranslation", trKey, overview, LIMITS.overview, "overview");
      const itinerary = clampWarn(report, "TourTranslation", trKey, buildItinerary(d.Description, locale), LIMITS.itinerary, "itinerary");

      const facts = buildCustomFacts([
        { label: "Duration", value: d.Length },
        { label: "Location", value: d.Location },
        { label: "Pick-up", value: pickup ? null : d.PickUpPoint },
        { label: "Safety", value: d.Safety },
        { label: "What to bring", value: d.WhatToPring },
        { label: "Cancellation", value: cancellation ? null : d.ChangesCancellations },
        { label: "Tour guide", value: guideLangs.length > 0 ? null : d.TourGuide },
      ]);
      for (const label of facts.truncated) report.warn("TourTranslation", trKey, `custom fact "${label}" truncated to 200 chars`);

      translations.push({
        locale,
        title: title || slug,
        overview,
        itinerary,
        highlights: buildList(report, trKey, "highlights", d.Highlights),
        included: buildList(report, trKey, "included", d.Includes),
        excluded: buildList(report, trKey, "excluded", d.Excludes),
        customFacts: facts.facts,
        metaDescription: nullable(clampWarn(report, "TourTranslation", trKey, htmlToInline(d.MetaDescription), LIMITS.metaDescription, "metaDescription")),
      });
    }

    builtTours.push({
      legacyId: t.TourId,
      slug,
      categoryLegacyId: t.TourCategoryId,
      destinationSlug,
      durationDays: days,
      basePrice: discount.basePrice,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      tourType: deriveTourType(days, t.TourCategoryId),
      pickupType: pickup,
      cancellationPolicy: cancellation,
      guideLanguages: guideLangs,
      featured: Boolean(t.BestSeller),
      status: t.Status === 2 ? "DISABLED" : "ACTIVE",
      translations,
    });
  }
  assertUniqueSlugs(builtTours, "Tour", report);

  // FAQs
  const builtFaqs: BuiltFaq[] = faqs.map((f) => ({
    legacyId: f.FaqId,
    order: f.SortOrder,
    translations: faqDescs
      .filter((d) => d.FaqId === f.FaqId)
      .map((d) => ({
        locale: LOCALE_MAP[d.LanguageId] as Locale,
        question: clampWarn(report, "FaqTranslation", `legacy:${f.FaqId}/${LOCALE_MAP[d.LanguageId]}`,
          htmlToInline(d.Question), LIMITS.faqQuestion, "question"),
        answer: clampWarn(report, "FaqTranslation", `legacy:${f.FaqId}/${LOCALE_MAP[d.LanguageId]}`,
          htmlToText(d.Answer), LIMITS.faqAnswer, "answer"),
      }))
      .filter((tr) => tr.question.length > 0 && tr.answer.length > 0),
  }));

  // Blog posts (English only)
  const builtBlogPosts: BuiltBlogPost[] = [];
  for (const b of blogs) {
    const d = blogDescs.find((x) => x.BlogId === b.BlogId);
    const key = `legacy:${b.BlogId}`;
    if (!d) {
      report.error("BlogPost", key, "no English description row — post not migrated");
      continue;
    }
    const slug = slugify(d.LinkUrl) || slugify(d.Name);
    if (!slug) {
      report.error("BlogPost", key, "slug empty after normalization — post not migrated");
      continue;
    }
    builtBlogPosts.push({
      legacyId: b.BlogId,
      slug,
      title: clampWarn(report, "BlogPost", key, trimCollapse(d.Name), LIMITS.blogTitle, "title"),
      excerpt: nullable(clampWarn(report, "BlogPost", key, htmlToInline(d.ShortDescription), LIMITS.blogExcerpt, "excerpt")),
      body: clampWarn(report, "BlogPost", key, htmlToText(d.Description), LIMITS.blogBody, "body"),
    });
  }
  assertUniqueSlugs(builtBlogPosts, "BlogPost", report);

  // Vehicles
  const builtVehicles: BuiltVehicle[] = fleet.map((f) => {
    const mapped = VEHICLE_MAP[f.FleetId];
    if (!mapped) report.warn("Vehicle", `legacy:${f.FleetId}`, `fleet row not in the plan's normalization table — using raw name "${trimCollapse(f.ReferenceName)}"`);
    return {
      legacyId: f.FleetId,
      name: mapped?.name ?? trimCollapse(f.ReferenceName),
      capacity: f.Max,
      type: mapped?.type ?? "vehicle",
    };
  });

  return { builtDestinations, builtCategories, builtTours, builtFaqs, builtBlogPosts, builtVehicles };
}

// Build helpers

function nullable(s: string): string | null {
  return s.length > 0 ? s : null;
}

function clampWarn(report: MigrationReport, entity: string, key: string, text: string, max: number, field: string): string {
  const { text: out, cut } = clamp(text, max);
  if (cut) report.warn(entity, key, `${field} truncated to ${max} chars`);
  return out;
}

function buildList(report: MigrationReport, key: string, field: string, html: string | null): string[] {
  let items = htmlToList(html);
  items = items.map((i) => {
    const { text, cut } = clamp(i, LIMITS.listItem);
    if (cut) report.warn("TourTranslation", key, `${field} item truncated to ${LIMITS.listItem} chars`);
    return text;
  });
  if (items.length > LIMITS.listMax) {
    report.warn("TourTranslation", key, `${field} has ${items.length} items — trimmed to ${LIMITS.listMax}`);
    items = items.slice(0, LIMITS.listMax);
  }
  return items;
}

function assertUniqueSlugs(rows: { legacyId: number; slug: string }[], entity: string, report: MigrationReport): void {
  const seen = new Map<string, number>();
  for (const r of rows) {
    const first = seen.get(r.slug);
    if (first !== undefined) {
      report.error(entity, `legacy:${r.legacyId}`, `slug "${r.slug}" collides with legacy:${first} — resolve before importing`);
    } else {
      seen.set(r.slug, r.legacyId);
    }
  }
}

// ─────────────────────────── Reconcile helpers ───────────────────────────

type Db = PrismaClient | Prisma.TransactionClient;

/** Normalized deep-equality across Prisma Decimals, Dates, arrays, and scalars. */
function same(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => {
    if (v === undefined) return null;
    if (v instanceof Date) return v.getTime();
    if (v !== null && typeof v === "object" && typeof (v as { toNumber?: () => number }).toNumber === "function") {
      return (v as { toNumber: () => number }).toNumber();
    }
    return v;
  };
  const na = norm(a);
  const nb = norm(b);
  if (Array.isArray(na) && Array.isArray(nb)) return JSON.stringify(na) === JSON.stringify(nb);
  return na === nb;
}

/** Keys in `desired` whose values differ from `existing`. */
function changedKeys<T extends Record<string, unknown>>(existing: Record<string, unknown>, desired: T): (keyof T)[] {
  return (Object.keys(desired) as (keyof T)[]).filter((k) => !same(existing[k as string], desired[k]));
}

/**
 * Deterministic match: id-map first (stale entries dropped with a warning),
 * then the entity's natural key. Returns the existing row or null.
 */
async function matchExisting<T extends { id: string }>(
  report: MigrationReport,
  entity: string,
  key: string,
  idMap: IdMap,
  section: IdMapSection,
  legacyId: number,
  findById: (id: string) => Promise<T | null>,
  findByNaturalKey: () => Promise<T | null>,
): Promise<T | null> {
  const mapped = idMap[section][String(legacyId)];
  if (mapped) {
    const byId = await findById(mapped);
    if (byId) return byId;
    report.warn(entity, key, `id-map entry ${mapped} no longer exists in target — falling back to natural key`);
    delete idMap[section][String(legacyId)];
  }
  const byNatural = await findByNaturalKey();
  if (byNatural) idMap[section][String(legacyId)] = byNatural.id;
  return byNatural;
}

/** Reconciles one child-translation row (compound-unique on parent+locale). */
async function reconcileTranslation(
  report: MigrationReport,
  write: boolean,
  entity: string,
  key: string,
  existing: Record<string, unknown> | null,
  desired: Record<string, unknown>,
  create: () => Promise<unknown>,
  update: (changed: string[]) => Promise<unknown>,
): Promise<void> {
  if (!existing) {
    if (write) await create();
    report.row(entity, key, "imported");
    return;
  }
  const changed = changedKeys(existing, desired) as string[];
  if (changed.length === 0) {
    report.row(entity, key, "skipped", "unchanged");
    return;
  }
  if (write) await update(changed);
  report.row(entity, key, "updated", `fields: ${changed.join(", ")}`);
}

// ─────────────────────────── Entity reconciliation ───────────────────────────

interface Ctx {
  report: MigrationReport;
  idMap: IdMap;
  write: boolean; // false in dry-run
}

async function reconcileDestinations(db: Db, built: BuiltDestination[], ctx: Ctx): Promise<Map<string, string>> {
  const { report, idMap, write } = ctx;
  const slugToId = new Map<string, string>(); // destination slug → id ("pending:" in dry-run creates)
  for (const d of built) {
    const key = `legacy:${d.legacyId} (${d.slug})`;
    const existing = await matchExisting(
      report, "Destination", key, idMap, "destinations", d.legacyId,
      (id) => db.destination.findUnique({ where: { id } }),
      () => db.destination.findUnique({ where: { slug: d.slug } }),
    );
    if (!existing) {
      if (write) {
        const created = await db.destination.create({ data: { slug: d.slug, order: d.order } });
        idMap.destinations[String(d.legacyId)] = created.id;
        slugToId.set(d.slug, created.id);
        for (const tr of d.translations) {
          await db.destinationTranslation.create({ data: { destinationId: created.id, locale: tr.locale, name: tr.name, description: tr.description } });
          ctx.report.row("DestinationTranslation", `${key}/${tr.locale}`, "imported");
        }
      } else {
        slugToId.set(d.slug, `pending:${d.slug}`);
        for (const tr of d.translations) report.row("DestinationTranslation", `${key}/${tr.locale}`, "imported");
      }
      report.row("Destination", key, "imported");
      continue;
    }

    slugToId.set(d.slug, existing.id);
    const desired = { order: d.order };
    const changed = changedKeys(existing as unknown as Record<string, unknown>, desired);
    if (changed.length === 0) {
      report.row("Destination", key, "skipped", "unchanged");
    } else {
      if (write) await db.destination.update({ where: { id: existing.id }, data: desired });
      report.row("Destination", key, "updated", `fields: ${changed.join(", ")}`);
    }
    for (const tr of d.translations) {
      const trExisting = await db.destinationTranslation.findUnique({
        where: { destinationId_locale: { destinationId: existing.id, locale: tr.locale } },
      });
      const desiredTr = { name: tr.name, description: tr.description };
      await reconcileTranslation(
        report, write, "DestinationTranslation", `${key}/${tr.locale}`,
        trExisting as unknown as Record<string, unknown> | null, desiredTr,
        () => db.destinationTranslation.create({ data: { destinationId: existing.id, locale: tr.locale, ...desiredTr } }),
        () => db.destinationTranslation.update({ where: { id: (trExisting as { id: string }).id }, data: desiredTr }),
      );
    }
  }
  return slugToId;
}

async function reconcileCategories(db: Db, built: BuiltCategory[], ctx: Ctx): Promise<Map<number, string>> {
  const { report, idMap, write } = ctx;
  const legacyToId = new Map<number, string>();
  for (const c of built) {
    const key = `legacy:${c.legacyId} (${c.slug})`;
    const existing = await matchExisting(
      report, "Category", key, idMap, "categories", c.legacyId,
      (id) => db.category.findUnique({ where: { id } }),
      () => db.category.findUnique({ where: { slug: c.slug } }),
    );
    if (!existing) {
      if (write) {
        const created = await db.category.create({ data: { slug: c.slug, order: c.order } });
        idMap.categories[String(c.legacyId)] = created.id;
        legacyToId.set(c.legacyId, created.id);
        for (const tr of c.translations) {
          await db.categoryTranslation.create({ data: { categoryId: created.id, locale: tr.locale, name: tr.name, description: tr.description } });
          report.row("CategoryTranslation", `${key}/${tr.locale}`, "imported");
        }
      } else {
        legacyToId.set(c.legacyId, `pending:${c.slug}`);
        for (const tr of c.translations) report.row("CategoryTranslation", `${key}/${tr.locale}`, "imported");
      }
      report.row("Category", key, "imported");
      continue;
    }

    legacyToId.set(c.legacyId, existing.id);
    const desired = { order: c.order };
    const changed = changedKeys(existing as unknown as Record<string, unknown>, desired);
    if (changed.length === 0) {
      report.row("Category", key, "skipped", "unchanged");
    } else {
      if (write) await db.category.update({ where: { id: existing.id }, data: desired });
      report.row("Category", key, "updated", `fields: ${changed.join(", ")}`);
    }
    for (const tr of c.translations) {
      const trExisting = await db.categoryTranslation.findUnique({
        where: { categoryId_locale: { categoryId: existing.id, locale: tr.locale } },
      });
      const desiredTr = { name: tr.name, description: tr.description };
      await reconcileTranslation(
        report, write, "CategoryTranslation", `${key}/${tr.locale}`,
        trExisting as unknown as Record<string, unknown> | null, desiredTr,
        () => db.categoryTranslation.create({ data: { categoryId: existing.id, locale: tr.locale, ...desiredTr } }),
        () => db.categoryTranslation.update({ where: { id: (trExisting as { id: string }).id }, data: desiredTr }),
      );
    }
  }
  return legacyToId;
}

async function reconcileTours(
  db: Db,
  built: BuiltTour[],
  categoryIds: Map<number, string>,
  destinationIds: Map<string, string>,
  ctx: Ctx,
): Promise<void> {
  const { report, idMap, write } = ctx;
  for (const t of built) {
    const key = `legacy:${t.legacyId} (${t.slug})`;
    try {
      const categoryId = categoryIds.get(t.categoryLegacyId) ?? null;
      const categoryPending = categoryId?.startsWith("pending:") ?? false;
      const destId = t.destinationSlug ? destinationIds.get(t.destinationSlug) ?? null : null;
      const destPending = destId?.startsWith("pending:") ?? false;

      const existing = await matchExisting(
        report, "Tour", key, idMap, "tours", t.legacyId,
        (id) => db.tour.findUnique({ where: { id } }),
        () => db.tour.findUnique({ where: { slug: t.slug } }),
      );

      // Migration-owned base fields. Null-valued optional enums/arrays are NOT
      // asserted on update (they'd clobber later admin curation); destinationId
      // is only owned when derivation produced a value (review tours stay manual).
      const owned: Record<string, unknown> = {
        durationDays: t.durationDays,
        basePrice: t.basePrice,
        currency: "USD",
        tourType: t.tourType,
        featured: t.featured,
        status: t.status,
      };
      if (!categoryPending && categoryId) owned.categoryId = categoryId;
      if (!destPending && destId) owned.destinationId = destId;
      if (t.discountType) {
        owned.discountType = t.discountType;
        owned.discountValue = t.discountValue;
      }
      if (t.pickupType) owned.pickupType = t.pickupType;
      if (t.cancellationPolicy) owned.cancellationPolicy = t.cancellationPolicy;
      if (t.guideLanguages.length > 0) owned.guideLanguages = t.guideLanguages;

      if (!existing) {
        let tourId = `pending:${t.slug}`;
        if (write) {
          const created = await db.tour.create({
            data: {
              slug: t.slug,
              categoryId: categoryId && !categoryPending ? categoryId : null,
              destinationId: destId && !destPending ? destId : null,
              durationDays: t.durationDays,
              basePrice: t.basePrice,
              currency: "USD",
              discountType: t.discountType,
              discountValue: t.discountValue,
              tourType: t.tourType,
              pickupType: t.pickupType,
              cancellationPolicy: t.cancellationPolicy,
              guideLanguages: t.guideLanguages,
              featured: t.featured,
              status: t.status,
            },
          });
          idMap.tours[String(t.legacyId)] = created.id;
          tourId = created.id;
        }
        report.row("Tour", key, "imported");
        for (const tr of t.translations) {
          if (write) {
            await db.tourTranslation.create({
              data: {
                tourId,
                locale: tr.locale,
                title: tr.title,
                overview: tr.overview,
                itinerary: tr.itinerary,
                highlights: tr.highlights,
                included: tr.included,
                excluded: tr.excluded,
                customFacts: tr.customFacts,
                metaDescription: tr.metaDescription,
              },
            });
          }
          report.row("TourTranslation", `${key}/${tr.locale}`, "imported");
        }
        continue;
      }

      const changed = changedKeys(existing as unknown as Record<string, unknown>, owned);
      if (changed.length === 0) {
        report.row("Tour", key, "skipped", "unchanged");
      } else {
        if (write) await db.tour.update({ where: { id: existing.id }, data: owned });
        report.row("Tour", key, "updated", `fields: ${changed.join(", ")}`);
      }

      for (const tr of t.translations) {
        const trExisting = await db.tourTranslation.findUnique({
          where: { tourId_locale: { tourId: existing.id, locale: tr.locale } },
        });
        const desiredTr: Record<string, unknown> = {
          title: tr.title,
          overview: tr.overview,
          itinerary: tr.itinerary,
          highlights: tr.highlights,
          included: tr.included,
          excluded: tr.excluded,
          customFacts: tr.customFacts,
        };
        if (tr.metaDescription) desiredTr.metaDescription = tr.metaDescription;
        await reconcileTranslation(
          report, write, "TourTranslation", `${key}/${tr.locale}`,
          trExisting as unknown as Record<string, unknown> | null, desiredTr,
          () => db.tourTranslation.create({
            data: { tourId: existing.id, locale: tr.locale, title: tr.title, overview: tr.overview, itinerary: tr.itinerary, highlights: tr.highlights, included: tr.included, excluded: tr.excluded, customFacts: tr.customFacts, metaDescription: tr.metaDescription },
          }),
          () => db.tourTranslation.update({ where: { id: (trExisting as { id: string }).id }, data: desiredTr }),
        );
      }
    } catch (err) {
      report.error("Tour", key, err instanceof Error ? err.message : String(err));
      // Import aborts immediately on any unexpected error — the entity
      // transaction rolls back. Dry-run keeps going to surface every issue.
      if (ctx.write) throw err;
    }
  }
}

async function reconcileFaqs(db: Db, built: BuiltFaq[], ctx: Ctx): Promise<void> {
  const { report, idMap, write } = ctx;
  for (const f of built) {
    const en = f.translations.find((tr) => tr.locale === "en");
    const key = `legacy:${f.legacyId}`;
    if (!en) {
      report.error("Faq", key, "no English question/answer after transform — FAQ not migrated");
      continue;
    }
    const existing = await matchExisting(
      report, "Faq", key, idMap, "faqs", f.legacyId,
      (id) => db.faq.findUnique({ where: { id } }),
      () => db.faq.findFirst({ where: { translations: { some: { locale: "en", question: en.question } } } }),
    );
    if (!existing) {
      let faqId = `pending:faq-${f.legacyId}`;
      if (write) {
        const created = await db.faq.create({ data: { order: f.order } });
        idMap.faqs[String(f.legacyId)] = created.id;
        faqId = created.id;
      }
      report.row("Faq", key, "imported");
      for (const tr of f.translations) {
        if (write) await db.faqTranslation.create({ data: { faqId, locale: tr.locale, question: tr.question, answer: tr.answer } });
        report.row("FaqTranslation", `${key}/${tr.locale}`, "imported");
      }
      continue;
    }

    const desired = { order: f.order };
    const changed = changedKeys(existing as unknown as Record<string, unknown>, desired);
    if (changed.length === 0) {
      report.row("Faq", key, "skipped", "unchanged");
    } else {
      if (write) await db.faq.update({ where: { id: existing.id }, data: desired });
      report.row("Faq", key, "updated", `fields: ${changed.join(", ")}`);
    }
    for (const tr of f.translations) {
      const trExisting = await db.faqTranslation.findUnique({
        where: { faqId_locale: { faqId: existing.id, locale: tr.locale } },
      });
      const desiredTr = { question: tr.question, answer: tr.answer };
      await reconcileTranslation(
        report, write, "FaqTranslation", `${key}/${tr.locale}`,
        trExisting as unknown as Record<string, unknown> | null, desiredTr,
        () => db.faqTranslation.create({ data: { faqId: existing.id, locale: tr.locale, ...desiredTr } }),
        () => db.faqTranslation.update({ where: { id: (trExisting as { id: string }).id }, data: desiredTr }),
      );
    }
  }
}

async function reconcileBlogPosts(db: Db, built: BuiltBlogPost[], ctx: Ctx): Promise<void> {
  const { report, idMap, write } = ctx;
  for (const b of built) {
    const key = `legacy:${b.legacyId} (${b.slug})`;
    const existing = await matchExisting(
      report, "BlogPost", key, idMap, "blogPosts", b.legacyId,
      (id) => db.blogPost.findUnique({ where: { id } }),
      () => db.blogPost.findUnique({ where: { slug: b.slug } }),
    );
    const desiredTr = { title: b.title, excerpt: b.excerpt, body: b.body };
    if (!existing) {
      if (write) {
        const created = await db.blogPost.create({
          data: { slug: b.slug, published: true, publishedAt: RUN_TIMESTAMP },
        });
        idMap.blogPosts[String(b.legacyId)] = created.id;
        await db.blogPostTranslation.create({ data: { postId: created.id, locale: "en", ...desiredTr } });
      }
      report.row("BlogPost", key, "imported");
      report.row("BlogPostTranslation", `${key}/en`, "imported");
      continue;
    }

    report.row("BlogPost", key, "skipped", "exists — base fields (published/publishedAt) are admin-owned after first import");
    const trExisting = await db.blogPostTranslation.findUnique({
      where: { postId_locale: { postId: existing.id, locale: "en" } },
    });
    await reconcileTranslation(
      report, write, "BlogPostTranslation", `${key}/en`,
      trExisting as unknown as Record<string, unknown> | null, desiredTr,
      () => db.blogPostTranslation.create({ data: { postId: existing.id, locale: "en", ...desiredTr } }),
      () => db.blogPostTranslation.update({ where: { id: (trExisting as { id: string }).id }, data: desiredTr }),
    );
  }
}

async function reconcileVehicles(db: Db, built: BuiltVehicle[], ctx: Ctx): Promise<void> {
  const { report, idMap, write } = ctx;
  for (const v of built) {
    const key = `legacy:${v.legacyId} (${v.name})`;
    const existing = await matchExisting(
      report, "Vehicle", key, idMap, "vehicles", v.legacyId,
      (id) => db.vehicle.findUnique({ where: { id } }),
      () => db.vehicle.findFirst({ where: { name: v.name } }),
    );
    if (!existing) {
      if (write) {
        const created = await db.vehicle.create({ data: { name: v.name, capacity: v.capacity, type: v.type, status: "ACTIVE" } });
        idMap.vehicles[String(v.legacyId)] = created.id;
      }
      report.row("Vehicle", key, "imported");
      continue;
    }
    const desired = { capacity: v.capacity };
    const changed = changedKeys(existing as unknown as Record<string, unknown>, desired);
    if (changed.length === 0) {
      report.row("Vehicle", key, "skipped", "unchanged");
    } else {
      if (write) await db.vehicle.update({ where: { id: existing.id }, data: desired });
      report.row("Vehicle", key, "updated", `fields: ${changed.join(", ")}`);
    }
  }
}

// ─────────────────────────── Hero banner handoff sheet ───────────────────────────

async function writeHeroHandoff(legacy: LegacyDb, report: MigrationReport): Promise<void> {
  const rows = await legacy.headerBoxes();
  const byBox = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byBox.get(r.HeaderBoxId) ?? [];
    list.push(r);
    byBox.set(r.HeaderBoxId, list);
  }
  const md: string[] = [
    "# Hero Banner Handoff Sheet (manual dashboard entry)",
    "",
    "Hero banners are NOT imported by the script — `imagePath` is required and all media is",
    "uploaded manually (plan §1). Create each banner in the dashboard after uploading its image,",
    "using the legacy text below. Boxes with an empty English headline are unusable as-is.",
    "",
  ];
  for (const [boxId, texts] of [...byBox.entries()].sort((a, b) => (a[1][0]?.SortOrder ?? 0) - (b[1][0]?.SortOrder ?? 0))) {
    const en = texts.find((t) => t.LanguageId === 1);
    const enName = trimCollapse(en?.Name ?? "");
    md.push(`## Legacy box ${boxId} — order ${texts[0]?.SortOrder ?? 0}, ${texts[0]?.Status === 1 ? "enabled" : "disabled"}${enName ? "" : " — ⚠️ EMPTY ENGLISH HEADLINE"}`);
    md.push("");
    md.push("| Locale | Headline | Subheadline |");
    md.push("|---|---|---|");
    for (const t of texts) {
      const locale = LOCALE_MAP[t.LanguageId] ?? String(t.LanguageId);
      md.push(`| ${locale} | ${trimCollapse(t.Name) || "—"} | ${htmlToInline(t.Description) || "—"} |`);
    }
    md.push("");
    if (!enName) report.warn("HeroBanner", `legacy:${boxId}`, "empty English headline — needs content before manual entry");
  }
  const file = path.join(PROJECT_ROOT, "docs", "migration", "handoff-hero-banners.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${md.join("\n")}\n`, "utf8");
}

// ─────────────────────────── Verify mode ───────────────────────────

async function verify(
  prisma: PrismaClient,
  built: Awaited<ReturnType<typeof buildAll>>,
  idMap: IdMap,
  report: MigrationReport,
): Promise<void> {
  const { builtDestinations, builtCategories, builtTours, builtFaqs, builtBlogPosts, builtVehicles } = built;

  // V1 — presence by natural key / id map
  const missing: string[] = [];
  const foundTourIds = new Map<number, string>();
  for (const d of builtDestinations) {
    const row = await prisma.destination.findUnique({ where: { slug: d.slug } });
    if (!row) missing.push(`Destination ${d.slug}`);
  }
  for (const c of builtCategories) {
    const row = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (!row) missing.push(`Category ${c.slug}`);
  }
  for (const t of builtTours) {
    const row = await prisma.tour.findUnique({ where: { slug: t.slug } });
    if (!row) missing.push(`Tour ${t.slug}`);
    else foundTourIds.set(t.legacyId, row.id);
  }
  for (const f of builtFaqs) {
    const en = f.translations.find((tr) => tr.locale === "en");
    const row = en
      ? await prisma.faq.findFirst({ where: { translations: { some: { locale: "en", question: en.question } } } })
      : null;
    if (!row) missing.push(`Faq legacy:${f.legacyId}`);
  }
  for (const b of builtBlogPosts) {
    const row = await prisma.blogPost.findUnique({ where: { slug: b.slug } });
    if (!row) missing.push(`BlogPost ${b.slug}`);
  }
  for (const v of builtVehicles) {
    const row = await prisma.vehicle.findFirst({ where: { name: v.name } });
    if (!row) missing.push(`Vehicle ${v.name}`);
  }
  report.check(
    "V1 presence",
    missing.length === 0,
    missing.length === 0
      ? `all ${builtDestinations.length + builtCategories.length + builtTours.length + builtFaqs.length + builtBlogPosts.length + builtVehicles.length} expected entities present`
      : `missing: ${missing.join("; ")}`,
  );

  // V2 — translation counts per tour
  const expectedTr = builtTours.reduce((n, t) => n + t.translations.length, 0);
  const actualTr = await prisma.tourTranslation.count({ where: { tourId: { in: [...foundTourIds.values()] } } });
  report.check("V2 tour translations", actualTr >= expectedTr, `expected ≥${expectedTr}, found ${actualTr}`);

  // V3 — currency + price invariants on migrated tours
  const tours = await prisma.tour.findMany({ where: { id: { in: [...foundTourIds.values()] } } });
  const badCurrency = tours.filter((t) => t.currency !== "USD");
  report.check("V3 currency USD", badCurrency.length === 0, badCurrency.length === 0 ? `${tours.length} tours all USD` : `non-USD: ${badCurrency.map((t) => t.slug).join(", ")}`);
  const badPrice = tours.filter((t) => Number(t.basePrice) <= 0);
  report.check("V4 basePrice > 0", badPrice.length === 0, badPrice.length === 0 ? "ok" : badPrice.map((t) => t.slug).join(", "));
  const badDiscount = tours.filter((t) => t.discountType === "FIXED" && (t.discountValue == null || Number(t.discountValue) >= Number(t.basePrice)));
  report.check("V5 discount sanity", badDiscount.length === 0, badDiscount.length === 0 ? "all FIXED discounts lower the price" : badDiscount.map((t) => t.slug).join(", "));

  // V6 — status + destination distribution matches the derivation
  const expectDisabled = builtTours.filter((t) => t.status === "DISABLED").length;
  const actualDisabled = tours.filter((t) => t.status === "DISABLED").length;
  report.check("V6 status split", actualDisabled === expectDisabled, `expected ${expectDisabled} DISABLED, found ${actualDisabled}`);
  const expectHurghada = builtTours.filter((t) => t.destinationSlug === "hurghada").length;
  const hurghada = await prisma.destination.findUnique({ where: { slug: "hurghada" } });
  const actualHurghada = hurghada ? tours.filter((t) => t.destinationId === hurghada.id).length : 0;
  report.check("V7 destination derivation", actualHurghada >= expectHurghada, `expected ≥${expectHurghada} tours on Hurghada, found ${actualHurghada} (review tours may since be assigned manually)`);

  // V8 — no empty required content
  const trRows = await prisma.tourTranslation.findMany({
    where: { tourId: { in: [...foundTourIds.values()] } },
    select: { title: true, overview: true, tour: { select: { slug: true } }, locale: true },
  });
  const emptyContent = trRows.filter((r) => !r.title.trim() || !r.overview.trim());
  report.check("V8 required content", emptyContent.length === 0, emptyContent.length === 0 ? "no empty titles/overviews" : emptyContent.map((r) => `${r.tour.slug}/${r.locale}`).join(", "));

  // V9 — id map integrity
  let stale = 0;
  const checks: [IdMapSection, (id: string) => Promise<{ id: string } | null>][] = [
    ["destinations", (id) => prisma.destination.findUnique({ where: { id } })],
    ["categories", (id) => prisma.category.findUnique({ where: { id } })],
    ["tours", (id) => prisma.tour.findUnique({ where: { id } })],
    ["faqs", (id) => prisma.faq.findUnique({ where: { id } })],
    ["blogPosts", (id) => prisma.blogPost.findUnique({ where: { id } })],
    ["vehicles", (id) => prisma.vehicle.findUnique({ where: { id } })],
  ];
  for (const [section, lookup] of checks) {
    for (const [legacyId, id] of Object.entries(idMap[section])) {
      if (!(await lookup(id))) {
        stale++;
        report.warn("IdMap", `${section}:${legacyId}`, `mapped id ${id} not found in target`);
      }
    }
  }
  report.check("V9 id-map integrity", stale === 0, stale === 0 ? "all id-map entries resolve" : `${stale} stale entries`);
}

// ─────────────────────────── Main ───────────────────────────

function parseMode(argv: string[]): Mode {
  const flags = argv.filter((a) => a.startsWith("--"));
  const modes = flags.filter((f) => ["--dry-run", "--import", "--verify"].includes(f));
  if (modes.length > 1) {
    console.error("Pass exactly one of --dry-run | --import | --verify.");
    process.exit(2);
  }
  if (modes.length === 0) {
    console.log("No mode flag given — defaulting to --dry-run (no writes).");
    return "dry-run";
  }
  return modes[0].slice(2) as Mode;
}

function gitCommit(): string {
  try {
    const hash = execSync("git rev-parse HEAD", { cwd: PROJECT_ROOT }).toString().trim();
    const dirty = execSync("git status --porcelain", { cwd: PROJECT_ROOT }).toString().trim().length > 0;
    return `${hash}${dirty ? " (dirty working tree)" : ""}`;
  } catch {
    return "unavailable";
  }
}

function latestBackupPath(): string {
  const dir = path.join(PROJECT_ROOT, "docs", "migration", "backups");
  if (!fs.existsSync(dir)) return "none found";
  const files = fs.readdirSync(dir).filter((f) => f.startsWith("backup-") && f.endsWith(".json")).sort();
  return files.length > 0 ? path.join("docs", "migration", "backups", files[files.length - 1]) : "none found";
}

function stampMeta(report: MigrationReport): void {
  const target = (process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "").replace(/\/\/[^@]*@/, "//***@");
  report.addMeta("Target DB", target || "unknown");
  report.addMeta("Legacy source", `${process.env.LEGACY_DB_SERVER}/${process.env.LEGACY_DB_NAME} (read-only, SELECT-only module)`);
  report.addMeta("Backup", latestBackupPath());
  report.addMeta("Git commit", gitCommit());
}

async function main(): Promise<void> {
  loadDotEnv();
  const mode = parseMode(process.argv.slice(2));
  const report = new MigrationReport(mode);
  const idMap = loadIdMap();

  const prisma = new PrismaClient({
    datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });
  const legacy = new LegacyDb();

  try {
    await legacy.connect();
    console.log(`Connected to legacy ${process.env.LEGACY_DB_NAME} — building desired state…`);
    stampMeta(report);
    const built = await buildAll(legacy, report);

    // Record the approved exclusions so every report is self-contained.
    report.row("Tour", `legacy:${EXCLUDED_TOUR_IDS[0]}`, "skipped", "excluded — confirmed duplicate of Tour 2 (approved decision 2)");
    report.row("Lead", "O_Request (355 rows)", "skipped", "leads not migrated (approved decision 1)");

    let aborted = false;

    if (mode === "verify") {
      await verify(prisma, built, idMap, report);
    } else {
      const ctx: Ctx = { report, idMap, write: mode === "import" };
      const run = async <T>(entity: string, fn: (db: Db) => Promise<T>): Promise<T> => {
        const t0 = Date.now();
        // --import: one interactive transaction per entity (requirement 1);
        // any error aborts the run and rolls back the current entity.
        const out =
          mode === "import"
            ? await prisma.$transaction((tx) => fn(tx), { timeout: 600_000, maxWait: 60_000 })
            : await fn(prisma);
        report.time(entity, Date.now() - t0);
        if (mode === "import") saveIdMap(idMap); // keep the id-map consistent with committed state
        return out;
      };

      try {
        const destinationIds = await run("Destination", (db) => reconcileDestinations(db, built.builtDestinations, ctx));
        const categoryIds = await run("Category", (db) => reconcileCategories(db, built.builtCategories, ctx));
        await run("Tour", (db) => reconcileTours(db, built.builtTours, categoryIds, destinationIds, ctx));
        await run("Faq", (db) => reconcileFaqs(db, built.builtFaqs, ctx));
        await run("BlogPost", (db) => reconcileBlogPosts(db, built.builtBlogPosts, ctx));
        await run("Vehicle", (db) => reconcileVehicles(db, built.builtVehicles, ctx));
        await writeHeroHandoff(legacy, report);
      } catch (err) {
        aborted = true;
        report.error(
          "run",
          "fatal",
          `${err instanceof Error ? err.message : String(err)} — import aborted; the failing entity's transaction was rolled back`,
        );
      }
    }

    const file = report.writeMarkdown(PROJECT_ROOT);
    console.log(report.consoleSummary());
    console.log(`\nReport written to ${path.relative(PROJECT_ROOT, file)}`);
    if (mode === "import") console.log(`Id map persisted at ${path.relative(PROJECT_ROOT, IDMAP_PATH)}`);

    if (report.errorCount > 0 || report.failedCheckCount > 0) process.exitCode = 1;

    // Requirement 6: full verification runs automatically after a clean import.
    if (mode === "import" && !aborted && report.errorCount === 0) {
      console.log("\nImport clean — running post-import verification…");
      const vReport = new MigrationReport("verify");
      stampMeta(vReport);
      await verify(prisma, built, idMap, vReport);
      const vFile = vReport.writeMarkdown(PROJECT_ROOT);
      console.log(vReport.consoleSummary());
      console.log(`\nVerify report written to ${path.relative(PROJECT_ROOT, vFile)}`);
      if (vReport.failedCheckCount > 0) process.exitCode = 1;
    }
  } finally {
    await legacy.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
