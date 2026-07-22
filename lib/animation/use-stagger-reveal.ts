"use client";

/**
 * Staggered scroll reveal — the animation layer for card grids and lists.
 *
 * This hook is the ONLY place the stagger behaviour is implemented. UI
 * primitives (components/site/stagger-group.tsx) consume it; page and data
 * components never import GSAP at all, so the animation layer stays isolated
 * from business logic and data fetching.
 *
 * Why GSAP here and not CSS: a grid needs its children sequenced relative to
 * each other and batched by what actually entered the viewport together —
 * `ScrollTrigger.batch()` does that with one trigger set per group. CSS can only
 * fade a whole block at once, which is why simple single-element reveals stay on
 * `.reveal-once` (see components/site/reveal.tsx) and are NOT routed through
 * this hook.
 *
 * SSR / FOUC contract: the hidden start state lives in CSS (`.stagger-once` in
 * globals.css), so server-rendered cards paint hidden and never flash
 * visible-then-hidden during hydration. This hook takes over by writing the same
 * hidden state inline, flips `data-revealed` so CSS stops competing, animates,
 * then clears its inline styles so hover transforms on the cards still work.
 */

import type { RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";
import { DISTANCE, DURATION, EASE, MEDIA, STAGGER } from "./tokens";

export interface StaggerRevealOptions {
  /** Seconds between siblings. Defaults to the grid rhythm (tighter on mobile). */
  stagger?: number;
  /** Rise distance in px. Defaults to the canonical 40px (shorter on mobile). */
  distance?: number;
  /**
   * ScrollTrigger start position. The default matches the `-12%` rootMargin in
   * components/site/reveal.tsx, so a GSAP grid and a CSS reveal on the same page
   * trigger at the same point on screen.
   */
  start?: string;
}

/**
 * Reveals the DIRECT CHILDREN of `scope` in a stagger as they scroll in.
 *
 * Targets direct children rather than a selector so the caller composes it by
 * simply being the grid container — no class contract to remember, and nothing
 * can accidentally match elements deeper in the tree.
 */
export function useStaggerReveal(
  scope: RefObject<HTMLElement | null>,
  options: StaggerRevealOptions = {},
): void {
  const { stagger, distance, start = "top 88%" } = options;

  useGSAP(
    () => {
      const container = scope.current;
      if (!container) return;

      const items = Array.from(container.children) as HTMLElement[];
      if (items.length === 0) return;

      const mm = gsap.matchMedia();

      /**
       * Registered under `motionOk`, so nothing below runs for a visitor who
       * asked for reduced motion — and if they toggle the OS setting mid-session
       * matchMedia reverts these tweens automatically, leaving the CSS
       * reduced-motion rule to show the cards. Motion is opt-in, never opt-out.
       */
      mm.add(MEDIA.motionOk, () => {
        /**
         * Read once rather than registering a breakpoint condition: these are
         * play-once entrances, so live-updating them on resize would only
         * re-hide and replay cards mid-scroll. Mobile gets a shorter rise and a
         * tighter stagger — on a short viewport the whole grid arrives at once,
         * and a long sequence reads as content lagging rather than settling.
         */
        const mobile = window.matchMedia(MEDIA.mobile).matches;
        const rise = distance ?? (mobile ? DISTANCE.riseMobile : DISTANCE.rise);
        const step = stagger ?? (mobile ? STAGGER.mobile : STAGGER.grid);

        // Take over the hidden state from CSS: write it inline for every item
        // FIRST, then flip the attribute. Order matters — flipping the attribute
        // while any item still relied on the CSS rule would pop it visible.
        gsap.set(items, { opacity: 0, y: rise });
        container.dataset.revealed = "";

        ScrollTrigger.batch(items, {
          start,
          once: true,
          // Cap the batch so a long catalog grid never sequences 12+ cards into
          // one visibly slow cascade; the next group starts its own.
          batchMax: mobile ? 3 : 6,
          onEnter: (batch) => {
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: DURATION.base,
              ease: EASE.out,
              stagger: step,
              overwrite: true,
              /**
               * Hand styling back to CSS on completion. Cards carry Tailwind
               * hover transforms (`hover:-translate-y-0.5`); a leftover inline
               * `transform` would outrank them and silently kill the hover lift.
               */
              clearProps: "opacity,transform",
            });
          },
        });
      });

      return () => mm.revert();
    },
    { scope },
  );
}
