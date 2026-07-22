"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/utils";

export function PriceSlider({
  min,
  max,
  currentMin,
  currentMax,
}: {
  min: number;
  max: number;
  currentMin?: number;
  currentMax?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [lo, setLo] = useState(currentMin ?? min);
  const [hi, setHi] = useState(currentMax ?? max);

  const span = Math.max(1, max - min);
  const pct = (v: number) => ((v - min) / span) * 100;

  function commit(nlo: number, nhi: number) {
    const p = new URLSearchParams(sp.toString());
    if (nlo > min) p.set("priceMin", String(nlo));
    else p.delete("priceMin");
    if (nhi < max) p.set("priceMax", String(nhi));
    else p.delete("priceMax");
    p.delete("page"); // changing the price range resets to the first page
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return (
    <div>
      <div className="dual-range relative my-3 h-1.5 rounded-full bg-line">
        <div
          className="absolute inset-y-0 rounded-full bg-accent"
          style={{ insetInlineStart: `${pct(lo)}%`, insetInlineEnd: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={lo}
          aria-label="Minimum price"
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - 1))}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={hi}
          aria-label="Maximum price"
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 1))}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
        />
      </div>
      <div className="flex justify-between text-[13px] text-muted">
        <span className="tabular-nums">{formatMoney(lo)}</span>
        <span className="tabular-nums">{formatMoney(hi)}</span>
      </div>
    </div>
  );
}
