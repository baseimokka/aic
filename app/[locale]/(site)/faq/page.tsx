import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { getGlobalFaqs } from "@/lib/db/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(isLocale(locale) ? locale : defaultLocale).faq.title };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const f = t.faq;

  // DB-managed global FAQs (Content Admin) drive the page; fall back to the
  // built-in catalog copy when none have been authored yet.
  const managed = await getGlobalFaqs(locale);
  const items = managed.length > 0 ? managed.map((m) => ({ q: m.question, a: m.answer })) : f.items;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="font-serif text-4xl font-medium text-ink">{f.title}</h1>
      <p className="mt-2 text-muted">{f.subtitle}</p>

      <div className="mt-8">
        {items.map((it, i) => (
          <details key={i} className="group border-b border-line py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg font-semibold text-ink">
              {it.q}
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="mt-3 leading-relaxed text-muted">{it.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
