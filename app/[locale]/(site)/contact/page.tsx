import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { localizedAlternates } from "@/lib/seo";
import { ContactForm } from "@/components/site/contact-form";
import { SocialLinks } from "@/components/site/social-links";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  return { title: getDictionary(locale).contact.title, alternates: localizedAlternates(locale, "/contact") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const c = t.contact;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-serif text-4xl font-medium text-ink">{c.title}</h1>
      <p className="mt-2 max-w-xl text-muted">{c.subtitle}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Channels */}
        <div className="flex flex-col gap-3">
          <a
            href="https://wa.me/201221416299"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-xl bg-whatsapp p-4 text-white"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
              <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
            </svg>
            <div>
              <div className="text-[15px] font-bold">{c.whatsapp}</div>
              <div className="text-[13px] text-white/85">{c.whatsappDesc}</div>
            </div>
          </a>

          <div className="flex items-center gap-3.5 rounded-xl border border-line bg-white p-4 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-accent)" strokeWidth={1.8} aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </span>
            <a href="mailto:info@aic-travel.com" className="text-[15px] font-bold text-ink">
              info@aic-travel.com
            </a>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-line bg-white p-4 shadow-card">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-2">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--color-accent)" strokeWidth={1.8} aria-hidden>
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
              </svg>
            </span>
            <a href="tel:+201221416299" className="text-[15px] font-bold text-ink">
              +20 122 141 6299
            </a>
          </div>

          <div className="mt-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{t.social.followUs}</h2>
            <SocialLinks locale={locale} tone="light" className="mt-3" />
          </div>
        </div>

        {/* Form */}
        <div className="rounded-[18px] border border-line bg-white p-6 shadow-card sm:p-8">
          <h2 className="font-serif text-2xl font-semibold text-ink">{c.formTitle}</h2>
          <div className="mt-6">
            <ContactForm labels={c} whatsappHref="https://wa.me/201221416299" locale={locale} />
          </div>
        </div>
      </div>
    </main>
  );
}
