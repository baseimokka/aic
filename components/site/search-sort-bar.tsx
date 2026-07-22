"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function SearchSortBar({
  labels,
  initialQuery,
  sort,
}: {
  labels: Dictionary["catalog"];
  initialQuery: string;
  sort: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(initialQuery);

  function push(params: URLSearchParams) {
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(sp.toString());
    const trimmed = q.trim();
    if (trimmed) p.set("q", trimmed);
    else p.delete("q");
    p.delete("page"); // new search starts at the first page
    push(p);
  }

  function changeSort(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(sp.toString());
    if (e.target.value && e.target.value !== "featured") p.set("sort", e.target.value);
    else p.delete("sort");
    p.delete("page"); // re-sorting resets to the first page
    push(p);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={submitSearch} className="relative flex-1">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="#6E6A80"
          strokeWidth={2}
          className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.search}
          className="h-12 w-full rounded-xl border-[1.5px] border-line-input bg-white ps-11 pe-4 text-[15px] text-ink placeholder:text-faint focus-visible:border-accent"
        />
      </form>
      <div className="relative shrink-0">
        <select
          value={sort}
          onChange={changeSort}
          aria-label={labels.sort}
          className="h-12 appearance-none rounded-xl border-[1.5px] border-line-input bg-white ps-4 pe-10 text-[15px] font-semibold text-ink"
        >
          <option value="featured">{labels.sortFeatured}</option>
          <option value="popular">{labels.sortPopular}</option>
          <option value="price-asc">{labels.sortPriceAsc}</option>
          <option value="price-desc">{labels.sortPriceDesc}</option>
          <option value="duration">{labels.sortDuration}</option>
        </select>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="#6E6A80"
          strokeWidth={2}
          className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
