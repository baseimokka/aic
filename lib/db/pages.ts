import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { resolveTranslation } from "./locale";
import type { Locale } from "@/lib/i18n/config";

const trFilter = (locale: Locale) => ({ where: { locale: { in: [locale, "en"] as Locale[] } } });

// ─────────────────────────── Destinations ───────────────────────────
export interface DestinationDetail {
  slug: string;
  name: string;
  description: string | null;
  imagePath: string | null;
}

export async function getDestinationBySlug(locale: Locale, slug: string): Promise<DestinationDetail | null> {
  const d = await prisma.destination.findFirst({
    where: { slug, archivedAt: null },
    include: { translations: trFilter(locale) },
  });
  if (!d) return null;
  const tr = resolveTranslation(d.translations, locale);
  return { slug: d.slug, name: tr?.name ?? d.slug, description: tr?.description ?? null, imagePath: d.heroImagePath };
}

export async function getDestinationSlugs(): Promise<string[]> {
  const rows = await prisma.destination.findMany({ where: { archivedAt: null }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

// ─────────────────────────── Blog (English-only, §21) ───────────────────────────
type BlogRow = Prisma.BlogPostGetPayload<{ include: { translations: true; category: true } }>;

export interface BlogListItem {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImagePath: string | null;
  category: string | null;
  publishedAt: string | null;
  featured: boolean;
}

export interface BlogArticle extends BlogListItem {
  body: string;
  seoTitle: string | null;
  metaDescription: string | null;
}

function toBlogItem(p: BlogRow): BlogListItem {
  const tr = p.translations.find((t) => t.locale === "en") ?? p.translations[0];
  return {
    slug: p.slug,
    title: tr?.title ?? p.slug,
    excerpt: tr?.excerpt ?? null,
    coverImagePath: p.coverImagePath,
    category: p.category?.name ?? null,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    featured: p.featured,
  };
}

export async function getBlogList(q?: string): Promise<BlogListItem[]> {
  const where: Prisma.BlogPostWhereInput = { published: true, archivedAt: null };
  if (q && q.trim()) {
    where.translations = { some: { locale: "en", title: { contains: q.trim(), mode: "insensitive" } } };
  }
  const rows = await prisma.blogPost.findMany({
    where,
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
    include: { translations: { where: { locale: "en" } }, category: true },
  });
  return rows.map(toBlogItem);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogArticle | null> {
  const p = await prisma.blogPost.findFirst({
    where: { slug, published: true, archivedAt: null },
    include: { translations: { where: { locale: "en" } }, category: true },
  });
  if (!p) return null;
  const tr = p.translations.find((t) => t.locale === "en") ?? p.translations[0];
  return {
    ...toBlogItem(p),
    body: tr?.body ?? "",
    seoTitle: tr?.seoTitle ?? null,
    metaDescription: tr?.metaDescription ?? null,
  };
}

export async function getBlogSlugs(): Promise<string[]> {
  const rows = await prisma.blogPost.findMany({ where: { published: true, archivedAt: null }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

// ─────────────────────────── Public operations data ───────────────────────────
export interface PublicGuide {
  name: string;
  languages: string[];
  available: boolean;
}

export async function getPublicGuides(): Promise<PublicGuide[]> {
  const rows = await prisma.guide.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    select: { name: true, languages: true, availabilityStatus: true },
  });
  return rows.map((g) => ({ name: g.name, languages: g.languages, available: g.availabilityStatus === "AVAILABLE" }));
}

export interface PublicVehicle {
  name: string;
  capacity: number;
  type: string;
}

export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  return prisma.vehicle.findMany({
    where: { archivedAt: null, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { name: true, capacity: true, type: true },
  });
}

// ─────────────────────────── Public transfer form data ───────────────────────────
export interface TransferVehicleOption {
  id: string;
  name: string;
  capacity: number;
}

export interface TransferLocationOption {
  id: string;
  name: string;
}

/** Route price row for the client-side price display; `vehicleId = null` = any vehicle. */
export interface TransferRateRow {
  fromLocationId: string;
  toLocationId: string;
  vehicleId: string | null;
  price: number;
  currency: string;
}

export interface TransferFormData {
  vehicles: TransferVehicleOption[];
  locations: TransferLocationOption[];
  rates: TransferRateRow[];
}

/**
 * Everything the public transfer form needs, in one round of lean queries.
 * Only active, non-archived options are offered; the displayed price is
 * informational — the API re-resolves it server-side at submission.
 */
export async function getTransferFormData(): Promise<TransferFormData> {
  const [vehicles, locations, rates] = await Promise.all([
    prisma.transferVehicle.findMany({
      where: { archivedAt: null, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, capacity: true },
    }),
    prisma.transferLocation.findMany({
      where: { archivedAt: null, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.transferRoute.findMany({
      where: { archivedAt: null },
      select: { fromLocationId: true, toLocationId: true, vehicleId: true, price: true, currency: true },
    }),
  ]);
  return {
    vehicles,
    locations,
    rates: rates.map((r) => ({
      fromLocationId: r.fromLocationId,
      toLocationId: r.toLocationId,
      vehicleId: r.vehicleId,
      price: Number(r.price),
      currency: r.currency,
    })),
  };
}
