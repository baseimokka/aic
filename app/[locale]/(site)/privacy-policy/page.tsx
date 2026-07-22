import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).legal.privacyTitle };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const l = t.legal;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{l.privacyTitle}</h1>
      <p className="mt-2 text-sm text-muted">
        {l.lastUpdated}: 5 Jul 2026
      </p>
      <div className="mt-8 space-y-4 leading-relaxed text-ink-soft">
        <p>{l.privacyIntro}</p>
      </div>
    </main>
  );
}
