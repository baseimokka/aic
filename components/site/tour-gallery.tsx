"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";

export interface GalleryLabels {
  title: string;
  viewAll: string;
  photos: string;
  open: string;
  close: string;
  previous: string;
  next: string;
}

type GalleryImage = { path: string; alt: string };

/** Vertical thumbnail slots beside the main stage on desktop (§14 lg breakpoint). */
const RAIL_SLOTS = 4;

/**
 * Tour gallery (§14 mobile-first): a large, swappable main stage plus a
 * thumbnail strip of every image, and a fullscreen lightbox for viewing any
 * photo at full size with keyboard/arrow navigation.
 *
 * Mobile/tablet: stage above a horizontally scrolling strip of every photo.
 * Desktop (lg+): stage at ~79% width beside a vertical rail of four thumbnails;
 * any photos past the fourth collapse into a "+N" overlay on the last slot that
 * opens the lightbox. Column order is set by the grid, so RTL mirrors for free.
 */
export function TourGallery({ images, labels }: { images: GalleryImage[]; labels: GalleryLabels }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (images.length === 0) return null;

  const safeActive = Math.min(active, images.length - 1);
  const current = images[safeActive];
  const multiple = images.length > 1;
  const overflow = images.length - RAIL_SLOTS;

  // Shared thumbnail geometry: fixed-width tiles in the mobile strip, tiles that
  // fill their row in the desktop rail.
  const thumbBase =
    "group/thumb relative block w-24 overflow-hidden rounded-[10px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-28 lg:h-full lg:w-full";

  // The rail relies on the grid's default `stretch` alignment to inherit the
  // stage's height — adding `items-start` below collapses it to a hairline.
  return (
    <div className={cn("mt-4", multiple && "lg:grid lg:grid-cols-[4fr_1fr] lg:gap-2.5")}>
      {/* Main stage */}
      <button
        type="button"
        onClick={() => setLightbox(true)}
        aria-label={labels.open}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MediaImage
          path={current.path}
          alt={current.alt}
          rounded={false}
          priority
          sizes="(max-width: 1024px) 100vw, (max-width: 1400px) 79vw, 1042px"
          className="aspect-[16/10] w-full"
        />
        {/* Expand affordance */}
        <span
          aria-hidden
          className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-navy/70 text-white backdrop-blur transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>
        {/* On desktop the "+N" rail tile already offers this, so drop the duplicate. */}
        {multiple && (
          <span
            className={cn(
              "absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-navy/75 px-3 py-1.5 text-xs font-bold text-white backdrop-blur",
              overflow > 0 && "lg:hidden",
            )}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            {labels.viewAll}
          </span>
        )}
        {multiple && (
          <span className="absolute bottom-3 start-3 rounded-full bg-navy/75 px-2.5 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur">
            {safeActive + 1} / {images.length}
          </span>
        )}
      </button>

      {/* Thumbnails — scrolling strip on mobile, vertical rail on desktop. The
          rail rows stretch to match the stage height, so the tiles echo its
          proportion instead of being letterboxed. */}
      {multiple && (
        <ul
          className="mt-2.5 flex gap-2.5 overflow-x-auto pb-1 lg:mt-0 lg:grid lg:gap-2.5 lg:overflow-visible lg:pb-0"
          style={{ gridTemplateRows: `repeat(${Math.min(images.length, RAIL_SLOTS)}, minmax(0, 1fr))` }}
          aria-label={labels.title}
        >
          {images.map((img, i) => {
            // The last rail slot becomes the "view all" tile when photos overflow.
            const isOverflowSlot = i === RAIL_SLOTS - 1 && overflow > 0;
            return (
              <li key={i} className={cn("shrink-0", i >= RAIL_SLOTS && "lg:hidden")}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-current={i === safeActive}
                  aria-label={`${labels.title} — ${i + 1}`}
                  className={cn(
                    thumbBase,
                    i === safeActive
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-cream"
                      : "opacity-80 hover:opacity-100",
                    isOverflowSlot && "lg:hidden",
                  )}
                >
                  <MediaImage
                    path={img.path}
                    alt={img.alt}
                    rounded={false}
                    sizes="(max-width: 1024px) 120px, 280px"
                    className="aspect-[4/3] w-full lg:aspect-auto lg:h-full"
                  />
                </button>

                {/* Desktop-only twin of the fourth tile: same frame, opens the
                    lightbox instead of swapping the stage. */}
                {isOverflowSlot && (
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    aria-label={`${labels.viewAll} (${images.length} ${labels.photos})`}
                    className={cn(thumbBase, "hidden cursor-zoom-in lg:block")}
                  >
                    <MediaImage
                      path={img.path}
                      alt=""
                      rounded={false}
                      sizes="280px"
                      className="aspect-[4/3] w-full lg:aspect-auto lg:h-full"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-navy/70 text-white backdrop-blur-[2px] transition-colors duration-200 group-hover/thumb:bg-navy/80 motion-reduce:transition-none"
                    >
                      <span className="text-lg font-bold tabular-nums">+{overflow}</span>
                      <span className="px-2 text-center text-[11px] font-semibold leading-tight">
                        {labels.viewAll}
                      </span>
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {lightbox && (
        <Lightbox
          images={images}
          index={safeActive}
          onIndex={setActive}
          onClose={() => setLightbox(false)}
          labels={labels}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  labels,
}: {
  images: GalleryImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  labels: GalleryLabels;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const multiple = images.length > 1;

  const go = useCallback(
    (delta: number) => onIndex((index + delta + images.length) % images.length),
    [index, images.length, onIndex],
  );

  // Lock body scroll while open; restore focus to the trigger on close.
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const restore = restoreRef.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      restore?.focus?.();
    };
  }, []);

  // Keyboard handling on the window so Escape / arrows work regardless of which
  // control currently holds focus (a div-scoped handler misses when focus is on
  // <body>). Tab is trapped within the dialog's controls.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight" && multiple) {
        go(1);
      } else if (e.key === "ArrowLeft" && multiple) {
        go(-1);
      } else if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, multiple, onClose]);

  const current = images[index];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      className="fixed inset-0 z-[100] flex flex-col bg-navy/95 backdrop-blur-sm"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
        <span className="text-sm font-semibold tabular-nums">
          {index + 1} / {images.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4 sm:px-16">
        {multiple && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={labels.previous}
            className="absolute start-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:start-5"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        <MediaImage
          key={index}
          path={current.path}
          alt={current.alt}
          rounded={false}
          fit="contain"
          sizes="100vw"
          className="h-full w-full !bg-transparent"
        />

        {multiple && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={labels.next}
            className="absolute end-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:end-5"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption */}
      {current.alt && (
        <p className="px-6 pb-4 text-center text-sm text-white/70">{current.alt}</p>
      )}
    </div>
  );
}
