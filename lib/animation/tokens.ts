/**
 * Motion tokens — the single numeric source of truth for GSAP animation.
 *
 * These values deliberately MIRROR the CSS motion system in app/globals.css
 * (`.reveal-once`, `.reveal-load`, `.hero-cta`). CSS drives every single-element
 * reveal and hover state, which it already does optimally; GSAP is used only
 * where siblings must be sequenced against each other, which CSS cannot express.
 * Both must speak the same motion language, so a GSAP-staggered grid and a CSS
 * reveal on the same page read as one system.
 *
 * If a value changes here it must change in globals.css too, and vice versa.
 *
 * Scope note: this file intentionally contains ONLY the values the shipped
 * animation actually uses. The motion system is closed — scroll-linked,
 * parallax, pinned and horizontal effects were all evaluated and deliberately
 * rejected — so speculative scales are not carried here.
 */

/** Seconds. GSAP works in seconds; the CSS equivalents are in ms. */
export const DURATION = {
  /** Canonical reveal — matches `.reveal-once` / `.reveal-load` (700ms). */
  base: 0.7,
} as const;

/**
 * The CSS system uses `ease-out` throughout; `power2.out` is its closest GSAP
 * analogue, so mixed CSS/GSAP sections decelerate identically.
 */
export const EASE = {
  out: "power2.out",
} as const;

/**
 * Travel distance in px for rise-in entrances. `rise` matches the 40px in
 * `.reveal-once`; `riseMobile` is deliberately shorter because on a short
 * viewport a full 40px rise reads as content arriving late rather than settling.
 */
export const DISTANCE = {
  rise: 40,
  riseMobile: 20,
} as const;

/**
 * Stagger in seconds between siblings in a grid.
 * Kept short — a 12-card catalog grid at 0.08s finishes in under a second, so
 * the last card is never left visibly waiting.
 */
export const STAGGER = {
  /** Card grids (tours, destinations, blog, guides, vehicles, categories). */
  grid: 0.08,
  /** Mobile — tighter; a 1-column grid enters almost as one block. */
  mobile: 0.04,
} as const;

/**
 * Media queries for `gsap.matchMedia()`. Centralised so the reduced-motion
 * query can never be mistyped — a typo there would silently expose motion to
 * users who asked not to see it.
 *
 * Breakpoints track the Tailwind defaults the site's grids already use.
 */
export const MEDIA = {
  /**
   * Motion is opt-IN: animation is registered under this query, so a visitor
   * who prefers reduced motion never has a tween created at all (rather than
   * having one created and then suppressed).
   */
  motionOk: "(prefers-reduced-motion: no-preference)",
  /** Mobile budget: shorter rise distance, tighter stagger. */
  mobile: "(max-width: 1023px)",
} as const;
