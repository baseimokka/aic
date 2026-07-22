import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getPublicVehicles } from "@/lib/db/pages";
import { StaggerGroup } from "@/components/site/stagger-group";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).transportPage.title };
}

export default async function TransportationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const tp = t.transportPage;
  const vehicles = await getPublicVehicles();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{tp.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{tp.subtitle}</p>

      <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <div key={v.name} className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent-deep">{v.type}</span>
            <h2 className="mt-1 font-serif text-xl font-semibold text-ink">{v.name}</h2>
            <p className="mt-3 text-sm text-muted">
              {tp.capacity}: <span className="font-semibold text-ink">{v.capacity} {tp.seats}</span>
            </p>
          </div>
        ))}
      </StaggerGroup>
    </main>
  );
}
