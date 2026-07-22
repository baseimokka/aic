import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).partners.title };
}

export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const p = t.partners;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{p.title}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">{p.lead}</p>

      <section className="mt-10 rounded-3xl border border-line bg-white p-8 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{t.brand.partnerRole}</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">{p.soholidaysTitle}</h2>
        <p className="mt-3 leading-relaxed text-ink-soft">{p.soholidays}</p>
      </section>
    </main>
  );
}
