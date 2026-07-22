"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FilterOptions } from "@/lib/db/queries";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PriceSlider } from "./price-slider";

export interface CurrentFilters {
  category: string;
  destination: string;
  type: string;
  duration: string;
  priceMin: string;
  priceMax: string;
  family: boolean;
  couple: boolean;
  solo: boolean;
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px]",
        checked ? "bg-accent" : "border-[1.5px] border-[#C3BCB0]",
      )}
    >
      {checked && (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth={3.2} aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

export function FilterPanel({
  options,
  labels,
  current,
}: {
  options: FilterOptions;
  labels: Dictionary["catalog"];
  current: CurrentFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  // Sections whose full option list is expanded (collapsed shows 2 options).
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function setParam(key: string, value: string | boolean | undefined) {
    const p = new URLSearchParams(sp.toString());
    if (value === undefined || value === "" || value === false) p.delete(key);
    else p.set(key, value === true ? "1" : String(value));
    p.delete("page"); // any filter change resets to the first page
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const sectionLabel = "mb-2.5 text-xs font-bold uppercase tracking-[0.06em] text-faint";

  // Single-select checkbox group (click active row to clear). Long lists are
  // collapsed to 2 options behind a "Show more" toggle; the active option is
  // always kept visible.
  const COLLAPSED_COUNT = 2;
  const group = (label: string, param: string, current: string, items: { value: string; label: string }[]) => {
    const isExpanded = !!expanded[param];
    let visible = items;
    if (!isExpanded && items.length > COLLAPSED_COUNT) {
      visible = items.slice(0, COLLAPSED_COUNT);
      const active = items.find((it) => it.value === current);
      if (active && !visible.some((it) => it.value === active.value)) visible = [...visible, active];
    }
    return (
      <div>
        <div className={sectionLabel}>{label}</div>
        <div className="flex flex-col gap-2.5">
          {visible.map((it) => {
            const checked = current === it.value;
            return (
              <button
                key={it.value}
                type="button"
                onClick={() => setParam(param, checked ? "" : it.value)}
                className="flex items-center gap-2.5 text-start text-sm text-ink-soft"
              >
                <CheckBox checked={checked} />
                {it.label}
              </button>
            );
          })}
        </div>
        {items.length > COLLAPSED_COUNT && (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setExpanded((prev) => ({ ...prev, [param]: !isExpanded }))}
            className="mt-2.5 text-[13px] font-bold text-accent hover:text-accent-deep"
          >
            {isExpanded ? labels.showLess : `${labels.showMore} (${items.length - visible.length})`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 flex h-11 w-full items-center justify-between rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink lg:hidden"
      >
        {labels.filters}
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
      </button>

      <div className={cn("space-y-6 rounded-2xl border border-line bg-white p-5 shadow-card", !open && "hidden lg:block")}>
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-bold text-ink">{labels.filters}</span>
          <button type="button" onClick={() => router.push(pathname, { scroll: false })} className="text-[13px] font-bold text-accent hover:text-accent-deep">
            {labels.clear}
          </button>
        </div>

        {options.destinations.length > 0 &&
          group(
            labels.destination,
            "destination",
            current.destination,
            options.destinations.map((d) => ({ value: d.slug, label: d.name })),
          )}

        {options.categories.length > 0 &&
          group(
            labels.category,
            "category",
            current.category,
            options.categories.map((c) => ({ value: c.slug, label: c.name })),
          )}

        {options.tourTypes.length > 0 &&
          group(
            labels.type,
            "type",
            current.type,
            options.tourTypes.map((tt) => ({ value: tt.value, label: tt.label })),
          )}

        {group(labels.duration, "duration", current.duration, [
          { value: "1", label: labels.durationDay },
          { value: "2-3", label: labels.durationShort },
          { value: "4-7", label: labels.durationWeek },
          { value: "8+", label: labels.durationLong },
        ])}

        <div>
          <div className={sectionLabel}>{labels.price}</div>
          <PriceSlider
            min={options.priceMin}
            max={options.priceMax}
            currentMin={current.priceMin ? Number(current.priceMin) : undefined}
            currentMax={current.priceMax ? Number(current.priceMax) : undefined}
          />
        </div>

        <div>
          <div className={sectionLabel}>{labels.suitability}</div>
          <div className="flex flex-wrap gap-2">
            {(["family", "couple", "solo"] as const).map((k) => {
              const active = current[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setParam(k, !active)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[13px] font-semibold",
                    active ? "bg-teal text-white" : "border-[1.5px] border-line-input bg-white text-ink",
                  )}
                >
                  {labels[k]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
