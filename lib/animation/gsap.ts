"use client";

/**
 * The ONLY place GSAP plugins are registered.
 *
 * Every animated component imports `gsap` / `ScrollTrigger` / `useGSAP` from
 * here rather than from the packages directly, so registration happens exactly
 * once. Registering twice is the classic duplication bug in GSAP codebases and
 * is silent — it costs bundle weight and can double-fire refresh handlers.
 *
 * Scope: the public marketing site only. The admin dashboard
 * (`app/[locale]/(admin)`) must never import this module — it is a daily-use
 * tool where motion is friction, and keeping the import out entirely keeps GSAP
 * out of that bundle.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { DURATION, EASE } from "./tokens";

/**
 * Client-only. Client Components are still rendered on the server, so this
 * module IS evaluated during SSR — `ScrollTrigger` reads `window` on init, so
 * registration is deferred to the browser. `useGSAP` is registered alongside so
 * GSAP knows to route its animations through the hook's cleanup context.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);

  /**
   * Project-wide tween defaults, matched to the CSS motion system so a GSAP
   * tween written with no explicit timing already agrees with `.reveal-once`.
   * Individual tweens override as needed.
   */
  gsap.defaults({
    duration: DURATION.base,
    ease: EASE.out,
  });
}

export { gsap, ScrollTrigger, useGSAP };
