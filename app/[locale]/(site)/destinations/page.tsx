import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getDestinations } from "@/lib/db/queries";
import { localizedAlternates } from "@/lib/seo";
import { MediaImage } from "@/components/ui/media-image";
import { StaggerGroup } from "@/components/site/stagger-group";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  return { title: getDictionary(locale).destinationsPage.title, alternates: localizedAlternates(locale, "/destinations") };
}

export default async function DestinationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const p = t.destinationsPage;
  const destinations = await getDestinations(locale);

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{p.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{p.subtitle}</p>

      <StaggerGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((d) => (
          <Link
            key={d.slug}
            href={`/${locale}/destinations/${d.slug}`}
            className="group relative isolate flex min-h-[220px] items-end overflow-hidden rounded-2xl"
          >
            <MediaImage path={d.imagePath} alt={d.name} rounded={false} className="absolute inset-0 -z-10 h-full w-full transition-transform duration-500 group-hover:scale-105" />
            <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/80 via-navy/15 to-transparent" />
            <div className="p-5">
              <h2 className="font-serif text-2xl font-semibold text-white">{d.name}</h2>
              {d.description && <p className="mt-1 line-clamp-1 text-sm text-white/80">{d.description}</p>}
            </div>
          </Link>
        ))}
      </StaggerGroup>
    </main>
  );
}
