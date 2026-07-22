import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { SITE_URL, localizedAlternates } from "@/lib/seo";
import {
  getHeroBanners,
  getFeaturedTours,
  getDestinations,
  getTestimonials,
  getHomepageSections,
} from "@/lib/db/queries";
import { getBlogList } from "@/lib/db/pages";
import { TourCard } from "@/components/site/tour-card";
import { MediaImage } from "@/components/ui/media-image";
import { HeroCarousel } from "@/components/site/hero-carousel";
import { Reveal } from "@/components/site/reveal";
import { StaggerGroup } from "@/components/site/stagger-group";
import { cn } from "@/lib/utils";

// Hourly ISR so scheduled tour-discount windows flip on the static homepage
// (featured tour cards) without an admin save.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : defaultLocale;
  return { alternates: localizedAlternates(locale, "/") };
}

const WHY_TINTS = [
  { bg: "bg-accent-soft", stroke: "var(--color-accent)" },
  { bg: "bg-teal-soft", stroke: "var(--color-teal)" },
  { bg: "bg-warning-soft", stroke: "var(--color-warning)" },
  { bg: "bg-surface-2", stroke: "var(--color-navy)" }, // navy — brand ink, not off-brand purple
];
const WHY_ICONS = [
  <path key="0" d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.9 5.7 21l2.3-7.1-6-4.5h7.6z" />,
  <path key="1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  <path key="2" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  <g key="3">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
  </g>,
];

function Stars({ n = 5, size = 16 }: { n?: number; size?: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${n} out of 5`}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size} fill="#F5A623" aria-hidden>
          <path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" />
        </svg>
      ))}
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDictionary(locale);
  const hx = t.homeExtra;

  const [heroes, featured, destinations, testimonials, blog, sections] = await Promise.all([
    getHeroBanners(locale),
    getFeaturedTours(locale, 3),
    getDestinations(locale),
    getTestimonials(locale),
    getBlogList(),
    getHomepageSections(locale),
  ]);
  const testimonial = testimonials[0];
  const posts = blog.slice(0, 3);

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "AIC Travel",
    description: "Premium curated tours across Egypt in partnership with SoHolidays.",
    url: `${SITE_URL}/${locale}`,
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />

      {/* HERO — full-bleed banner carousel: all enabled banners cross-fade with a
          slow Ken Burns zoom; each carries its own headline, CTA (hover-revealed)
          and search. See components/site/hero-carousel.tsx. */}
      {heroes.length > 0 ? (
        <HeroCarousel
          slides={heroes}
          locale={locale}
          eyebrow={hx.heroEyebrow}
          searchPlaceholder={hx.heroSearch}
          searchLabel={hx.search}
          prevLabel={hx.heroPrev}
          nextLabel={hx.heroNext}
          gotoLabel={hx.heroGoto}
        />
      ) : (
        /* Fallback hero — keeps the page's h1 and the layered featured-sheet
           overlap when no banner is enabled (e.g. before hero images are
           uploaded). Brand strings only; no banner-specific copy. */
        <section className="relative bg-navy pb-24 pt-24 text-white sm:pt-28">
          <div className="mx-auto max-w-[1360px] px-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">{hx.heroEyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.05] sm:text-5xl">{t.brand.name}</h1>
            <p className="mt-4 text-base leading-relaxed text-white/85">{t.brand.partnership}</p>
          </div>
        </section>
      )}

      {/* FEATURED TOURS — the page's opening sheet. It lifts 48px over the hero's
          bottom edge; the rounded top corners let the banner show through, so the
          two read as one layered surface instead of stacked bands. Content rises
          in once — the heading and CTA via <Reveal>, the cards individually via
          <StaggerGroup> — while the sheet itself stays put, so the layered edge
          never wobbles. */}
      {sections["featured-tours"] && featured.length > 0 && (
        <section className="relative z-10 -mt-12 rounded-t-[32px] bg-cream">
          <div className="mx-auto max-w-[1360px] px-6 pb-14 pt-20 sm:pt-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{hx.featuredEyebrow}</p>
              <h2 className="mt-1.5 font-serif text-3xl font-semibold text-ink">{sections["featured-tours"]?.heading ?? t.nav.tours}</h2>
            </Reveal>
            {/* Mobile: one swipeable rail (.card-rail) — three stacked cards
                push the section CTA off a phone screen. sm+: the normal grid. */}
            <StaggerGroup className="card-rail mt-8 gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((tour) => (
                <TourCard key={tour.slug} tour={tour} locale={locale} />
              ))}
            </StaggerGroup>
            <Reveal className="mt-10 text-center">
              <Link href={`/${locale}/tours`} className="text-sm font-bold text-accent hover:text-accent-deep">
                {sections["featured-tours"]?.ctaLabel ?? hx.exploreAll} &rarr;
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* WHY CHOOSE US */}
      {sections["why-us"] && (
      <section>
        <div className="mx-auto max-w-[1360px] px-6 py-14">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-semibold text-ink">{sections["why-us"]?.heading ?? "Why travelers choose AIC"}</h2>
            {sections["why-us"]?.body && <p className="mt-2 text-muted">{sections["why-us"].body}</p>}
          </Reveal>
          <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.whyUs.points.map((p, i) => (
              <div key={i}>
                <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl", WHY_TINTS[i % 4].bg)}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={WHY_TINTS[i % 4].stroke} strokeWidth={2} aria-hidden>
                    {WHY_ICONS[i % 4]}
                  </svg>
                </span>
                <h3 className="mt-3 text-base font-bold text-ink">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </StaggerGroup>
        </div>
      </section>
      )}

      {/* POPULAR DESTINATIONS — bento */}
      {sections["destinations"] && destinations.length > 0 && (
        <section>
          <div className="mx-auto max-w-[1360px] px-6 py-14">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold text-ink">{sections["destinations"]?.heading ?? t.destinationsPage.title}</h2>
              {sections["destinations"]?.body && <p className="mt-2 text-muted">{sections["destinations"].body}</p>}
            </Reveal>
            <StaggerGroup className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {destinations.slice(0, 5).map((d, i) => (
                <Link
                  key={d.slug}
                  href={`/${locale}/destinations/${d.slug}`}
                  className={cn(
                    "group relative isolate flex items-end overflow-hidden rounded-2xl",
                    i === 0 ? "col-span-2 row-span-2 min-h-[260px]" : "min-h-[150px]",
                  )}
                >
                  <MediaImage path={d.imagePath} alt={d.name} rounded={false} className="absolute inset-0 -z-10 h-full w-full transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/75 via-navy/10 to-transparent" />
                  <div className="p-4">
                    <div className={cn("font-serif font-semibold text-white", i === 0 ? "text-2xl" : "text-lg")}>{d.name}</div>
                  </div>
                </Link>
              ))}
            </StaggerGroup>
          </div>
        </section>
      )}

      {/* PARTNERSHIP + TESTIMONIAL — two-column editorial block. The heading is a
          column header sitting beside the quote card, not a section header, so it
          stays start-aligned; centering it would break the pairing. */}
      {sections["about"] && (
      <section className="bg-navy text-white">
        <Reveal className="mx-auto grid max-w-[1360px] gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gold">{t.brand.partnerRole}</p>
            <h2 className="mt-2.5 font-serif text-3xl font-medium">{sections["about"]?.heading ?? "AIC Travel & SoHolidays"}</h2>
            {sections["about"]?.body && <p className="mt-3 max-w-lg leading-relaxed text-white/70">{sections["about"].body}</p>}
            <Link href={`/${locale}/about`} className="mt-5 inline-flex text-sm font-bold text-gold hover:text-white">
              {sections["about"]?.ctaLabel ?? t.nav.about} &rarr;
            </Link>
          </div>
          {testimonial && (
            <figure className="rounded-2xl border border-white/12 bg-white/[0.06] p-6">
              <Stars n={testimonial.rating ?? 5} />
              <blockquote className="mt-3 font-serif text-xl leading-relaxed text-white">&ldquo;{testimonial.quote}&rdquo;</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                  {testimonial.authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
                <span>
                  <span className="block text-sm font-bold">{testimonial.authorName}</span>
                  {testimonial.authorCountry && <span className="block text-xs text-white/60">{testimonial.authorCountry}</span>}
                </span>
              </figcaption>
            </figure>
          )}
        </Reveal>
      </section>
      )}

      {/* LATEST JOURNAL */}
      {sections["latest-blog"] && posts.length > 0 && (
        <section>
          <div className="mx-auto max-w-[1360px] px-6 py-14">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold text-ink">{sections["latest-blog"]?.heading ?? t.blog.title}</h2>
            </Reveal>
            {/* Mobile: swipeable rail, same as featured tours above. */}
            <StaggerGroup className="card-rail mt-8 gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/en/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  <MediaImage path={post.coverImagePath} alt={post.title} rounded={false} className="aspect-[16/9] w-full" />
                  <div className="flex flex-1 flex-col p-5">
                    {post.category && <span className="text-[11px] font-bold uppercase tracking-wide text-teal">{post.category}</span>}
                    <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-ink transition-colors group-hover:text-accent-deep">{post.title}</h3>
                    {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted">{post.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </StaggerGroup>
            <Reveal className="mt-10 text-center">
              <Link href="/en/blog" className="text-sm font-bold text-accent hover:text-accent-deep">
                {sections["latest-blog"]?.ctaLabel ?? t.actions.readBlog} &rarr;
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* CONTACT CTA — orange gradient. Closing beat: the block is centered as a
          whole so the page ends on the same axis its sections are set on. */}
      {sections["contact-cta"] && (
      <section className="mx-auto max-w-[1360px] px-6 pb-16 pt-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent-deep px-8 py-14 text-white sm:px-12">
          <span aria-hidden className="absolute -bottom-16 -end-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/85">{t.brand.name}</p>
            <h2 className="mt-2 font-serif text-3xl font-medium sm:text-4xl">{sections["contact-cta"]?.heading ?? t.contact.title}</h2>
            {sections["contact-cta"]?.body && <p className="mt-3 text-white/90">{sections["contact-cta"].body}</p>}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`/${locale}/tailor-made`} className="inline-flex h-12 items-center rounded-xl bg-white px-6 font-bold text-ink transition-colors hover:bg-white/90">
                {sections["contact-cta"]?.ctaLabel ?? t.nav.tailorMade}
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
      )}
    </main>
  );
}
