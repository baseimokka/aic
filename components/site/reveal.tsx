"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One-shot scroll reveal. Fades and rises its children the first time they
 * enter the viewport, then disconnects — it never replays on scroll-back.
 * The hidden start state and the timing live in `.reveal-once` (globals.css),
 * which opts out entirely under prefers-reduced-motion or without scripting.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setRevealed(true);
      },
      // Fire once the top edge has cleared the bottom 12% of the viewport,
      // so the section is settled on screen before it animates.
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [revealed]);

  return (
    <div ref={ref} data-revealed={revealed ? "" : undefined} className={cn("reveal-once", className)}>
      {children}
    </div>
  );
}
