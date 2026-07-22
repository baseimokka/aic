/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { SocialLinks } from "@/components/site/social-links";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const year = new Date().getFullYear();

  const col = (title: string, links: { href: string; label: string }[]) => (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gold">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-[color:rgba(255,255,255,0.75)] transition-colors hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="bg-navy text-white">
      {/* gold ribbon — a quiet, intentional ending to every page */}
      <div aria-hidden className="h-0.5 bg-gradient-to-r from-gold via-accent to-gold opacity-80" />
      <div className="mx-auto grid max-w-[1360px] gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <img src="/brand/aic-logo-reversed.png" alt="AIC Travel" width={258} height={126} className="h-[42px] w-auto" />
          <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-[color:rgba(255,255,255,0.65)]">{t.footer.tagline}</p>
          <div className="mt-5 flex items-center gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[color:rgba(255,255,255,0.5)]">
              {t.brand.partnerRole}
            </span>
            <span className="rounded-md bg-cream px-2 py-1">
              <img src="/brand/soholidays-logo.png" alt="SoHolidays" width={298} height={96} className="h-[18px] w-auto" />
            </span>
          </div>
          <SocialLinks locale={locale} tone="dark" className="mt-6" />
        </div>

        {col(t.footer.explore, [
          { href: `/${locale}/tours`, label: t.nav.tours },
          { href: `/${locale}/destinations`, label: t.nav.destinations },
          { href: `/${locale}/experiences`, label: t.experiences.title },
          { href: `/en/blog`, label: t.nav.blog },
        ])}
        {col(t.footer.company, [
          { href: `/${locale}/about`, label: t.nav.about },
          { href: `/${locale}/partners`, label: t.partners.title },
          { href: `/${locale}/guides`, label: t.guidesPage.title },
          { href: `/${locale}/transportation`, label: t.transportPage.title },
        ])}

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gold">{t.footer.talk}</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-[color:rgba(255,255,255,0.75)]">
            <a href="https://wa.me/201221416299" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 hover:text-white">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="#25D366" aria-hidden>
                <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
              </svg>
              +20 122 141 6299
            </a>
            <a href="mailto:info@aic-travel.com" className="flex items-center gap-2.5 hover:text-white">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              info@aic-travel.com
            </a>
            <Link
              href={`/${locale}/contact`}
              className="mt-1 inline-flex h-11 items-center self-start rounded-[10px] bg-gold px-5 text-sm font-bold text-ink"
            >
              {t.nav.contact}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-6 py-5 text-xs text-[color:rgba(255,255,255,0.5)] sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {year} AIC Travel. {t.brand.partnership}.
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/${locale}/faq`} className="hover:text-white">
              {t.faq.title}
            </Link>
            <Link href={`/${locale}/privacy-policy`} className="hover:text-white">
              {t.footer.privacy}
            </Link>
            <Link href={`/${locale}/terms-and-conditions`} className="hover:text-white">
              {t.footer.terms}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
