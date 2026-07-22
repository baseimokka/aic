"use client";

import { localeFlags, localeNames, translationTabOrder, type Locale } from "@/lib/i18n/config";
import type { LocaleCoverage } from "@/lib/translation/coverage";

/**
 * Language tab strip — doubles as the locale switcher for the editor. English
 * leads (source); each tab shows a status dot: ✓ complete, ◐ partial, ○ missing.
 */
export function TranslationTabs({
  selected,
  onSelect,
  coverage,
}: {
  selected: Locale;
  onSelect: (locale: Locale) => void;
  coverage: Record<string, LocaleCoverage>;
}) {
  return (
    <div role="tablist" aria-label="Translation languages" className="flex flex-wrap gap-1.5">
      {translationTabOrder.map((l) => {
        const active = l === selected;
        const c = coverage[l];
        const dot =
          l === "en" || c?.complete ? (
            <span className="text-success-deep" aria-hidden>✓</span>
          ) : c?.exists && c.filled > 0 ? (
            <span className="text-[#c98a16]" aria-hidden>◐</span>
          ) : (
            <span className="text-faint" aria-hidden>○</span>
          );
        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(l)}
            className={`inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-[13px] font-bold transition-colors ${
              active
                ? "border-accent bg-accent-soft text-accent-deep"
                : "border-line-input bg-white text-ink-soft hover:bg-cream"
            }`}
          >
            <span aria-hidden>{localeFlags[l]}</span>
            <span>{localeNames[l].english}</span>
            {l === "en" ? <span className="text-[10px] font-semibold text-faint">source</span> : dot}
          </button>
        );
      })}
    </div>
  );
}
