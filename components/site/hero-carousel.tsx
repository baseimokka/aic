"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import type { HeroSlideData } from "@/lib/db/queries";
import { MediaImage } from "@/components/ui/media-image";
import { HeroSearch } from "@/components/site/hero-search";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 6500;
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

// ── prefers-reduced-motion, via the codebase's useSyncExternalStore idiom ──
function subscribeMotion(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(REDUCE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => false, // SSR / first paint: assume motion is allowed
  );
}

/** Resolve an admin-entered ctaUrl to a browser href (locale-aware for internal paths). */
function resolveHref(ctaUrl: string | null, locale: Locale): { href: string; external: boolean } | null {
  if (!ctaUrl) return null;
  if (/^(https?:|mailto:|tel:)/i.test(ctaUrl)) return { href: ctaUrl, external: true };
  const path = ctaUrl.startsWith("/") ? ctaUrl : `/${ctaUrl}`;
  const firstSeg = path.split("/")[1];
  // Already locale-prefixed (e.g. "/en/tours") — leave as-is; otherwise prefix the active locale.
  return { href: isLocale(firstSeg) ? path : `/${locale}${path}`, external: false };
}

const CTA_CLASS =
  "inline-flex h-12 items-center gap-2 rounded-xl bg-gold px-6 font-bold text-navy shadow-lift transition-colors duration-150 hover:bg-white focus-visible:bg-white";

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="rtl:-scale-x-100"
    >
      <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

interface HeroCarouselProps {
  slides: HeroSlideData[];
  locale: Locale;
  eyebrow: string;
  searchPlaceholder: string;
  searchLabel: string;
  prevLabel: string;
  nextLabel: string;
  gotoLabel: string;
}

export function HeroCarousel({
  slides,
  locale,
  eyebrow,
  searchPlaceholder,
  searchLabel,
  prevLabel,
  nextLabel,
  gotoLabel,
}: HeroCarouselProps) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  // Touch swipe (mobile) — a horizontal drag past the threshold moves one slide.
  // We only act when the gesture is predominantly horizontal, so a vertical
  // scroll through the hero is never hijacked. RTL-aware: swiping toward the
  // page's start edge advances, matching the arrows' direction.
  const SWIPE_THRESHOLD = 48; // px
  const touch = useRef<{ x: number; y: number } | null>(null);
  const rtl = typeof document !== "undefined" && document.dir === "rtl";
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touch.current;
      touch.current = null;
      if (!start || count <= 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      // Swipe left (dx<0) → next in LTR; mirrored in RTL.
      const forward = rtl ? dx > 0 : dx < 0;
      go(index + (forward ? 1 : -1));
    },
    [go, index, count, rtl],
  );

  // Auto-advance — paused on hover/focus and under prefers-reduced-motion.
  useEffect(() => {
    if (count <= 1 || paused || reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reduced]);

  if (count === 0) return null;
  const multi = count > 1;

  return (
    <section
      className="relative isolate min-h-[640px] overflow-hidden lg:min-h-[720px]"
      aria-roledescription="carousel"
      aria-label={eyebrow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <ul className="absolute inset-0" aria-live={paused ? "polite" : "off"}>
        {slides.map((slide, i) => {
          const active = i === index;
          const cta = resolveHref(slide.ctaUrl, locale);
          return (
            <li
              key={i}
              inert={!active}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              className={cn(
                "hero-hover-root absolute inset-0 transition-opacity duration-[900ms] ease-out motion-reduce:transition-none",
                !active && "pointer-events-none",
              )}
              style={{ opacity: active ? 1 : 0, zIndex: active ? 10 : 0 }}
            >
              <MediaImage
                path={slide.imagePath}
                alt={slide.headline}
                rounded={false}
                priority={i === 0}
                // Full-bleed background, so it spans the viewport at every
                // breakpoint. Quality is raised above the site-wide 75 because
                // this is the LCP element and its smooth sky/water gradients
                // band badly through a second WebP generation (§ next.config
                // images.qualities).
                sizes="100vw"
                quality={85}
                className={cn("absolute inset-0 -z-10 h-full w-full", active && "hero-kenburns")}
              />
              <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/85 via-navy/45 to-transparent rtl:bg-gradient-to-l"
              />
              <div className="mx-auto flex h-full max-w-[1360px] flex-col justify-center px-6 py-24">
                {/* Text only — the banner image and the cross-fade are untouched.
                    .reveal-load plays the section reveal once at page load (see
                    globals.css); slide changes stay a pure cross-fade. */}
                <div className="reveal-load max-w-xl text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold">{eyebrow}</p>
                  <h1 className="mt-3 text-balance font-serif text-4xl font-medium leading-[1.05] sm:text-5xl">
                    {slide.headline}
                  </h1>
                  {slide.subheadline && (
                    <p className="mt-4 max-w-lg text-base leading-relaxed text-white/85">{slide.subheadline}</p>
                  )}
                  {cta && slide.ctaLabel && (
                    <div className="hero-cta mt-6">
                      {cta.external ? (
                        <a href={cta.href} target="_blank" rel="noopener noreferrer" className={CTA_CLASS}>
                          {slide.ctaLabel}
                          <Chevron dir="next" />
                        </a>
                      ) : (
                        <Link href={cta.href} className={CTA_CLASS}>
                          {slide.ctaLabel}
                          <Chevron dir="next" />
                        </Link>
                      )}
                    </div>
                  )}
                  {slide.showSearch && (
                    <div className="mt-6">
                      <HeroSearch locale={locale} placeholder={searchPlaceholder} label={searchLabel} />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Controls — only when there is more than one banner. */}
      {multi && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="mx-auto flex h-full max-w-[1360px] items-end justify-between gap-4 px-6 pb-16">
            <div className="pointer-events-auto flex items-center gap-2.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-current={i === index}
                  aria-label={`${gotoLabel} ${i + 1}`}
                  onClick={() => go(i)}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
                    i === index ? "w-7 bg-gold" : "w-2.5 bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
            <div className="pointer-events-auto hidden items-center gap-2 sm:flex">
              <button
                type="button"
                aria-label={prevLabel}
                onClick={() => go(index - 1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-navy/25 text-white backdrop-blur-sm transition-colors hover:bg-navy/45"
              >
                <Chevron dir="prev" />
              </button>
              <button
                type="button"
                aria-label={nextLabel}
                onClick={() => go(index + 1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-navy/25 text-white backdrop-blur-sm transition-colors hover:bg-navy/45"
              >
                <Chevron dir="next" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
