"use client";

import { useRef, type ReactNode } from "react";
import { useStaggerReveal } from "@/lib/animation/use-stagger-reveal";
import { cn } from "@/lib/utils";

/**
 * Reveals its direct children in a stagger as they scroll into view.
 *
 * Opting a grid in is a one-word change — swap the wrapper element and keep the
 * layout classes exactly as they were:
 *
 *   <div className="mt-8 grid gap-6 sm:grid-cols-2">     →
 *   <StaggerGroup className="mt-8 grid gap-6 sm:grid-cols-2">
 *
 * Layout stays entirely in the caller's className; this component contributes
 * no spacing, sizing or typography of its own. It is the UI layer only — all
 * GSAP lives behind useStaggerReveal, so pages and data components never import
 * an animation library.
 *
 * For a single block that just fades and rises, use <Reveal> instead — that is
 * CSS-only and cheaper. This is for siblings that need sequencing.
 */
export function StaggerGroup({
  children,
  className,
  stagger,
  distance,
}: {
  children: ReactNode;
  className?: string;
  /** Override the seconds between siblings. Defaults to the grid rhythm. */
  stagger?: number;
  /** Override the rise distance in px. Defaults to the canonical 40px. */
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useStaggerReveal(ref, { stagger, distance });

  return (
    <div ref={ref} className={cn("stagger-once", className)}>
      {children}
    </div>
  );
}
