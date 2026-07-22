import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { locales } from "@/lib/i18n/config";
import { getTourSlugs } from "@/lib/db/queries";
import { getDestinationSlugs, getBlogSlugs } from "@/lib/db/pages";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tourSlugs, destSlugs, blogSlugs] = await Promise.all([
    getTourSlugs(),
    getDestinationSlugs(),
    getBlogSlugs(),
  ]);
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Localized core routes (PRD §15) with hreflang alternates.
  const localizedPaths = [
    "",
    "/tours",
    "/tailor-made",
    "/destinations",
    "/experiences",
    "/about",
    "/partners",
    "/guides",
    "/transportation",
    "/transfers",
    "/contact",
    "/faq",
    "/privacy-policy",
    "/terms-and-conditions",
  ];
  for (const p of localizedPaths) {
    const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${p}`]));
    for (const l of locales) {
      entries.push({ url: `${SITE_URL}/${l}${p}`, lastModified: now, alternates: { languages } });
    }
  }

  // Tour detail — one entry per active tour, per locale.
  for (const slug of tourSlugs) {
    const languages = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}/tours/${slug}`]));
    for (const l of locales) {
      entries.push({ url: `${SITE_URL}/${l}/tours/${slug}`, lastModified: now, alternates: { languages } });
    }
  }

  // Destinations — per locale.
  for (const slug of destSlugs) {
    for (const l of locales) {
      entries.push({ url: `${SITE_URL}/${l}/destinations/${slug}`, lastModified: now });
    }
  }

  // Blog — English-only (§21).
  entries.push({ url: `${SITE_URL}/en/blog`, lastModified: now });
  for (const slug of blogSlugs) {
    entries.push({ url: `${SITE_URL}/en/blog/${slug}`, lastModified: now });
  }

  return entries;
}
