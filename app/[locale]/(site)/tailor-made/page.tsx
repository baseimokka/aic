import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import { TailorMadeForm } from "@/components/site/tailor-made-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const tm = getDictionary(locale).tailorMade;
  return { title: tm.title, description: tm.metaDescription, alternates: localizedAlternates(locale, "/tailor-made") };
}

/**
 * Tailor-made trip request — the platform feature behind the "tailored
 * itineraries" promise. Submits through the existing booking-request pipeline
 * with no tour attached (`requestType: "tailor-made"`); the aside reuses the
 * About page's already-translated how-it-works steps.
 */
export default async function TailorMadePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const tm = t.tailorMade;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="reveal-load max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{t.nav.tailorMade}</p>
        <h1 className="mt-3 text-balance font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">{tm.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{tm.lead}</p>
      </header>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <TailorMadeForm labels={t.booking} tm={tm} locale={locale} whatsappHref="https://wa.me/201221416299" />

        {/* How it works — compact version of the About timeline, same steps. */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[18px] border border-line bg-white p-6 shadow-card sm:p-8">
            <h2 className="font-serif text-2xl font-semibold text-ink">{t.about.howTitle}</h2>
            <ol className="ms-4 mt-6 border-s-2 border-line">
              {t.about.steps.map((s, i) => {
                const last = i === t.about.steps.length - 1;
                return (
                  <li key={i} className={`relative ps-8 ${last ? "" : "pb-6"}`}>
                    <span
                      aria-hidden
                      className={`absolute -start-[1.0625rem] top-0 flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${
                        last ? "bg-accent text-white" : "border-2 border-line bg-white text-accent"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <h3 className="pt-1 text-[15px] font-bold text-ink">{s.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Fastest channel — mirrors the contact page's WhatsApp card. */}
          <a
            href="https://wa.me/201221416299"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-3.5 rounded-xl bg-whatsapp p-4 text-white"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
              <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
            </svg>
            <div>
              <div className="text-[15px] font-bold">{t.contact.whatsapp}</div>
              <div className="text-[13px] text-white/85">{t.contact.whatsappDesc}</div>
            </div>
          </a>
        </aside>
      </div>
    </main>
  );
}
