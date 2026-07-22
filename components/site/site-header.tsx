/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getNavCategories } from "@/lib/db/queries";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";
import { ToursMenu } from "./tours-menu";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  // Dynamic "Tours" dropdown: localized category links into the existing
  // catalog filter (/tours?category=slug) — one lean query per request.
  const categories = await getNavCategories(locale);
  const tourCategories = categories.map((c) => ({
    href: `/${locale}/tours?category=${encodeURIComponent(c.slug)}`,
    label: c.name,
  }));
  const toursItem = { href: `/${locale}/tours`, label: t.nav.tours };
  const nav = [
    { href: `/${locale}`, label: t.nav.home, exact: true },
    toursItem,
    { href: `/${locale}/tailor-made`, label: t.nav.tailorMade },
    { href: `/${locale}/destinations`, label: t.nav.destinations },
    { href: `/${locale}/transfers`, label: t.nav.transfers },
    { href: `/en/blog`, label: t.nav.blog },
    { href: `/${locale}/about`, label: t.nav.about },
  ];
  // CTA lands on the contact page, so it reads "Contact" — "Request Booking"
  // is reserved for the true booking action on tour detail pages.
  const cta = { href: `/${locale}/contact`, label: t.nav.contact };
  const mobileItems = [
    ...nav.map((n) => (n === toursItem ? { ...n, children: tourCategories } : n)),
    { href: `/${locale}/contact`, label: t.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center gap-5 px-4 py-3 sm:px-6">
        {/* Brand lockup — AIC leads, SoHolidays as endorsed Official Tourism Partner.
            dir="ltr": the lockup is a fixed brand plate and renders identically on RTL pages. */}
        <Link
          href={`/${locale}`}
          dir="ltr"
          className="flex shrink-0 items-center gap-5"
          aria-label="AIC Travel — in partnership with SoHolidays, Official Tourism Partner"
        >
          <img src="/brand/aic-logo.png" alt="AIC Travel" width={270} height={132} className="h-10 w-auto sm:h-11" />
          <span aria-hidden className="hidden h-11 w-px bg-line sm:block" />
          <span className="hidden flex-col justify-center gap-1.5 sm:flex">
            <span className="text-[8px] font-bold uppercase leading-none tracking-[0.22em] text-faint">
              {t.brand.partnerRole}
            </span>
            <img src="/brand/soholidays-logo.png" alt="SoHolidays" width={298} height={96} className="h-8 w-auto" />
          </span>
        </Link>

        <nav className="ms-auto hidden items-center gap-6 lg:flex">
          {nav.map((n) =>
            n === toursItem ? (
              <ToursMenu key={n.href} href={n.href} label={n.label} items={tourCategories} allToursLabel={t.actions.viewAllTours} />
            ) : (
              <NavLink key={n.href} {...n} />
            ),
          )}
        </nav>

        <div className="ms-auto flex items-center gap-2.5 lg:ms-6">
          <LocaleSwitcher current={locale} />
          <Link
            href={cta.href}
            className="hidden h-10 items-center rounded-xl bg-accent px-4 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-accent-deep active:scale-[0.98] motion-reduce:active:scale-100 sm:inline-flex"
          >
            {cta.label}
          </Link>
          <MobileNav items={mobileItems} cta={cta} locale={locale} whatsappLabel={t.actions.contactWhatsApp} partnerRole={t.brand.partnerRole} />
        </div>
      </div>
    </header>
  );
}
