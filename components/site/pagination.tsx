"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function Pagination({
  page,
  totalPages,
  labels,
}: {
  page: number;
  totalPages: number;
  labels: Dictionary["catalog"];
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  if (totalPages <= 1) return null;

  // Preserve every active filter/search/sort param; only swap `page`.
  const href = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const status = labels.pageStatus.replace("{current}", String(page)).replace("{total}", String(totalPages));

  const base = "flex h-11 min-w-11 items-center justify-center rounded-[10px] border-[1.5px] px-4 text-sm font-bold";
  const enabled = "border-ink bg-white text-ink hover:bg-surface-2";
  const inert = "border-line bg-surface-2 text-faint";

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" aria-label={labels.pagePrev} className={cn(base, enabled)}>
          {labels.pagePrev}
        </Link>
      ) : (
        <span aria-disabled className={cn(base, inert)}>
          {labels.pagePrev}
        </span>
      )}

      <span className="text-sm font-semibold text-muted tabular-nums">{status}</span>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" aria-label={labels.pageNext} className={cn(base, enabled)}>
          {labels.pageNext}
        </Link>
      ) : (
        <span aria-disabled className={cn(base, inert)}>
          {labels.pageNext}
        </span>
      )}
    </nav>
  );
}
