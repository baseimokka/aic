/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";
import { MediaImage } from "@/components/ui/media-image";
import { Reveal } from "@/components/site/reveal";
import { StaggerGroup } from "@/components/site/stagger-group";
import { SocialLinks } from "@/components/site/social-links";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  const a = getDictionary(locale).about;
  return { title: a.title, description: a.metaDescription, alternates: localizedAlternates(locale, "/about") };
}

/* Hero photograph — sunlit temple hieroglyphs from the media library. Editorial
   and on-palette (sandstone golds); swap the path when About-specific
   photography is uploaded via the Media Library. */
const HERO_IMAGE = "/uploads/hero/mo-gabrail-iuc3w8mldcs-unsplash-bca5fa5661ac.webp";

/* Icon tiles rotate through the same brand tints as the homepage "why" grid. */
const TINTS = [
  { bg: "bg-accent-soft", stroke: "var(--color-accent)" },
  { bg: "bg-teal-soft", stroke: "var(--color-teal)" },
  { bg: "bg-warning-soft", stroke: "var(--color-warning)" },
  { bg: "bg-surface-2", stroke: "var(--color-navy)" },
];

/* What-we-do cards: tailor-made tours, transfers, hotels, flights, visa, SIM. */
const SERVICE_ICONS = [
  <g key="tours">
    <path d="M9 4l6 2 6-2v14l-6 2-6-2-6 2V6l6-2z" />
    <path d="M9 4v14M15 6v14" />
  </g>,
  <g key="transfers">
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="5" r="2" />
    <path d="M8 19h7a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h7" />
  </g>,
  <g key="hotels">
    <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
    <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
    <path d="M2 17h20" />
  </g>,
  <g key="flights">
    <path d="M2 21h20" />
    <path d="M3.5 13.5 2 9l2-.5 3 2.5 5-1.5-4-6 2.5-.5 6.5 5 4.5-1.5a2 2 0 0 1 2.5 1.5c.2 1-.4 1.9-1.4 2.2L6 14.5z" />
  </g>,
  <g key="visa">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="m9 15 2 2 4-4" />
  </g>,
  <g key="sim">
    <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <rect x="8" y="13" width="8" height="5" rx="1" />
  </g>,
];

/* Why-travel-with-us: Hurghada base, licensed guides, drivers, tailoring, languages, 24/7. */
const WHY_ICONS = [
  <g key="local">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </g>,
  <g key="guides">
    <circle cx="12" cy="8" r="6" />
    <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
  </g>,
  <g key="drivers">
    <path d="M5 17h14M6.5 17l1-5h9l1 5M8 12l1.5-4h5L16 12" />
    <circle cx="7.5" cy="17" r="1.5" />
    <circle cx="16.5" cy="17" r="1.5" />
  </g>,
  <g key="tailored">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </g>,
  <g key="languages">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
  </g>,
  <g key="support">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </g>,
];

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const a = t.about;

  // Founding year and address are client-confirmed facts (2018, Hurghada).
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "AIC Travel",
    foundingDate: "2018",
    address: { "@type": "PostalAddress", addressLocality: "Hurghada", addressCountry: "EG" },
    areaServed: "Egypt",
    url: `${SITE_URL}/${locale}/about`,
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }} />

      {/* HERO — editorial opening; text animates at first paint (reveal-load),
          never behind hydration, since this is the page's LCP. */}
      <header className="mx-auto max-w-4xl px-6 pt-12">
        <div className="reveal-load">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{t.nav.about}</p>
          <h1 className="mt-3 text-balance font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">{a.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{a.lead}</p>
        </div>

        <MediaImage path={HERO_IMAGE} alt={a.heroAlt} priority sizes="(max-width: 1024px) 100vw, 896px" className="mt-8 aspect-[21/9] w-full" />

        {/* Partner lockup — AIC leads, SoHolidays as official tourism partner. */}
        <div className="mt-8 flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-white p-6 shadow-card">
          <img src="/brand/aic-logo.png" alt="AIC Travel" width={270} height={132} className="h-[44px] w-auto" />
          <span className="h-10 w-px bg-line" aria-hidden />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">{t.brand.partnerRole}</div>
            <img src="/brand/soholidays-logo.png" alt="SoHolidays" width={298} height={96} className="mt-1 h-[22px] w-auto" />
          </div>
        </div>
      </header>

      {/* OUR STORY — founded 2018 in Hurghada; three short beats, no wall of text. */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold text-ink">{a.storyTitle}</h2>
          <div className="mt-5 space-y-4">
            {a.storyParagraphs.map((p, i) => (
              <p key={i} className="max-w-3xl text-[15px] leading-[1.75] text-ink-soft">
                {p}
              </p>
            ))}
          </div>
        </Reveal>
      </section>

      {/* WHAT WE DO — the six real services from the confirmed offering. */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-3xl font-semibold text-ink">{a.servicesTitle}</h2>
          <p className="mt-2 text-muted">{a.servicesLead}</p>
        </Reveal>
        <StaggerGroup className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {a.services.map((s, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl", TINTS[i % 4].bg)}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={TINTS[i % 4].stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {SERVICE_ICONS[i % SERVICE_ICONS.length]}
                </svg>
              </span>
              <h3 className="mt-3 text-base font-bold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </StaggerGroup>
      </section>

      {/* WHY TRAVEL WITH US — the page's navy emphasis beat, mirroring the
          homepage rhythm. Every point is factual: no "best", no invented stats. */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold">{t.brand.name}</p>
            <h2 className="mt-2 font-serif text-3xl font-medium">{a.whyTitle}</h2>
            <p className="mt-2 text-white/70">{a.whyLead}</p>
          </Reveal>
          <StaggerGroup className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {a.why.map((w, i) => (
              <div key={i}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06]">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--color-gold)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {WHY_ICONS[i % WHY_ICONS.length]}
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-bold">{w.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{w.body}</p>
              </div>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* HOW IT WORKS — the request-based booking flow of THIS platform:
          request → advisor → itinerary → confirmation → trip. Logical
          properties throughout, so the timeline mirrors cleanly in RTL. */}
      <section className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold text-ink">{a.howTitle}</h2>
          <p className="mt-2 max-w-2xl text-muted">{a.howLead}</p>
          <ol className="ms-5 mt-10 border-s-2 border-line">
            {a.steps.map((s, i) => {
              const last = i === a.steps.length - 1;
              return (
                <li key={i} className={cn("relative ps-10", !last && "pb-10")}>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -start-[1.3125rem] top-0 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      last ? "bg-accent text-white" : "border-2 border-line bg-white text-accent",
                    )}
                  >
                    {i + 1}
                  </span>
                  <h3 className="pt-2 text-base font-bold text-ink">{s.title}</h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </section>

      {/* CTA — same closing beat as the homepage: orange gradient, two actions. */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-2">
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent-deep px-8 py-14 text-white sm:px-12">
          <span aria-hidden className="absolute -bottom-16 -end-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{t.brand.name}</p>
            <h2 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{a.ctaTitle}</h2>
            <p className="mt-3 text-white/90">{a.ctaBody}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`/${locale}/contact`} className="inline-flex h-12 items-center rounded-xl bg-white px-6 font-bold text-ink transition-colors hover:bg-white/90">
                {t.nav.contact}
              </Link>
              <a
                href="https://wa.me/201221416299"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center rounded-xl border-[1.5px] border-white/50 bg-white/15 px-6 font-bold text-white transition-colors hover:bg-white/25"
              >
                {t.actions.contactWhatsApp}
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* SOCIAL */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="border-t border-line pt-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{t.social.followUs}</h2>
          <SocialLinks locale={locale} tone="light" className="mt-4" />
        </div>
      </section>
    </main>
  );
}
