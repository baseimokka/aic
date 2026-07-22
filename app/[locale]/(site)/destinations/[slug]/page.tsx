import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { searchTours } from "@/lib/db/queries";
import { getDestinationBySlug, getDestinationSlugs } from "@/lib/db/pages";
import { localizedAlternates } from "@/lib/seo";
import { TourCard } from "@/components/site/tour-card";
import { StaggerGroup } from "@/components/site/stagger-group";
import { MediaImage } from "@/components/ui/media-image";

// Hourly ISR so scheduled tour-discount windows flip on the tour cards here
// without an admin save.
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getDestinationSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const dest = await getDestinationBySlug(locale, slug);
  if (!dest) return { title: "Destination" };
  return {
    title: dest.name,
    description: dest.description ?? undefined,
    alternates: localizedAlternates(locale, `/destinations/${slug}`),
  };
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const p = t.destinationsPage;

  const dest = await getDestinationBySlug(locale, slug);
  if (!dest) notFound();

  const { tours } = await searchTours(locale, { destination: slug });

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-8">
      <Link href={`/${locale}/destinations`} className="text-sm text-muted hover:text-ink">
        &larr; {p.title}
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl">
        <MediaImage path={dest.imagePath} alt={dest.name} rounded={false} className="aspect-[21/9] w-full" />
      </div>

      <h1 className="mt-6 font-serif text-4xl font-medium text-ink">{dest.name}</h1>
      {dest.description && <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{dest.description}</p>}

      <h2 className="mt-12 font-serif text-2xl font-semibold text-ink">
        {p.toursIn} {dest.name}
      </h2>
      {tours.length > 0 ? (
        <StaggerGroup className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} locale={locale} />
          ))}
        </StaggerGroup>
      ) : (
        <p className="mt-4 text-muted">{p.noTours}</p>
      )}
    </main>
  );
}
