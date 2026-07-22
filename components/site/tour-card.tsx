"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MediaImage } from "@/components/ui/media-image";
import { Stars } from "@/components/site/stars";
import { cn, formatMoney } from "@/lib/utils";
import { getDictionary, tourTypeLabel } from "@/lib/i18n/dictionaries";
import { formatDayCount } from "@/lib/i18n/plural";
import type { Locale } from "@/lib/i18n/config";
import type { TourCardData } from "@/lib/db/queries";

export function TourCard({ tour, locale }: { tour: TourCardData; locale: Locale }) {
  const t = getDictionary(locale);
  const images = tour.imagePaths.length > 0 ? tour.imagePaths : [tour.imagePath];
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dots follow the scroll position — this is what makes touch swipe (which
  // scrolls the snap track natively) update the indicator on mobile.
  function onScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex((prev) => (prev === i ? prev : i));
  }

  function scrollToIndex(i: number, smooth = true) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }

  // Desktop only: auto-advance the carousel while hovered. Touch devices swipe
  // manually instead (§14 mobile-first), so we skip the timer there.
  function startCycling() {
    if (images.length < 2 || timer.current) return;
    if (typeof window !== "undefined") {
      const canHover = window.matchMedia("(hover: hover)").matches;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!canHover || reduced) return;
    }
    timer.current = setInterval(() => {
      const el = trackRef.current;
      if (!el || el.clientWidth === 0) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % images.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 1400);
  }

  function stopCycling() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    scrollToIndex(0);
  }

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return (
    <Link
      href={`/${locale}/tours/${tour.slug}`}
      onMouseEnter={startCycling}
      onMouseLeave={stopCycling}
      className="group block overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* Swipeable, snap-aligned image track — native horizontal scroll on touch */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          onDragStart={(e) => e.preventDefault()}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((path, i) => (
            <div key={i} className="relative h-full w-full shrink-0 snap-center">
              <MediaImage
                path={path}
                alt={i === 0 ? tour.title : ""}
                rounded={false}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transform-none"
              />
            </div>
          ))}
        </div>
        <span className="pointer-events-none absolute start-3 top-3 z-10 rounded-full bg-navy/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
          {tourTypeLabel(t, tour.tourType)}
        </span>
        {tour.discountPercent != null && (
          <span className="pointer-events-none absolute end-3 top-3 z-10 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
            <span aria-hidden>−{tour.discountPercent}%</span>
            <span className="sr-only">{t.tourCard.percentOff.replace("{percent}", String(tour.discountPercent))}</span>
          </span>
        )}
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5" aria-hidden>
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full bg-white shadow-sm transition-all duration-300",
                  i === index ? "w-4 opacity-95" : "w-1.5 opacity-60",
                )}
              />
            ))}
          </div>
        )}
      </div>
      <div className="p-4">
        {tour.destination && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {tour.destination}
          </div>
        )}
        <h3 className="mt-1.5 line-clamp-2 font-serif text-[19px] font-semibold leading-snug text-ink transition-colors group-hover:text-accent-deep">
          {tour.title}
        </h3>
        {tour.ratingAvg != null && tour.ratingCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars
              value={tour.ratingAvg}
              size={13}
              label={t.tourCard.rating
                .replace("{rating}", String(tour.ratingAvg))
                .replace("{count}", String(tour.ratingCount))}
            />
            <span aria-hidden className="text-[13px] font-bold tabular-nums text-ink">
              {tour.ratingAvg.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span aria-hidden className="text-[13px] text-faint tabular-nums">({tour.ratingCount})</span>
          </div>
        )}
        <div className="mt-3 flex items-end justify-between border-t border-line-soft pt-3">
          <div>
            <span className="text-xs text-faint">{t.tourCard.from}</span>
            {tour.discountPercent != null && (
              <s className="block text-[13px] font-semibold leading-tight text-faint tabular-nums">
                <span className="sr-only">{t.tourCard.originalPrice}: </span>
                {formatMoney(tour.basePrice, tour.currency)}
              </s>
            )}
            <div className="text-[22px] font-extrabold leading-none text-ink">
              <span className="tabular-nums">{formatMoney(tour.effectivePrice, tour.currency)}</span>{" "}
              <span className="text-[13px] font-medium text-faint">/ {t.tourCard.perPerson}</span>
            </div>
          </div>
          <span className="whitespace-nowrap text-[13px] text-muted">
            {formatDayCount(tour.durationDays, locale, t.tourCard)}
          </span>
        </div>
      </div>
    </Link>
  );
}
