import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getCategories } from "@/lib/db/queries";
import { StaggerGroup } from "@/components/site/stagger-group";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).experiences.title };
}

export default async function ExperiencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const e = t.experiences;
  const categories = await getCategories(locale);

  return (
    <main className="mx-auto max-w-[1360px] px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{e.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{e.subtitle}</p>

      <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/${locale}/tours?category=${c.slug}`}
            className="group rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <h2 className="font-serif text-xl font-semibold text-ink transition-colors group-hover:text-accent-deep">{c.name}</h2>
            {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
            <span className="mt-4 inline-block text-sm font-semibold text-accent-deep">{t.destinationsPage.explore} &rarr;</span>
          </Link>
        ))}
      </StaggerGroup>
    </main>
  );
}
