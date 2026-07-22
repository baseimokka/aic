import { localeNames, localeFlags, translationTabOrder, type Locale } from "@/lib/i18n/config";
import { coverageLabel, type LocaleCoverage } from "@/lib/translation/coverage";

const EMPTY: LocaleCoverage = { exists: false, filled: 0, total: 0, complete: false, usable: false, percent: 0 };

/**
 * Coverage summary across the six target locales — an overall completion % plus
 * a per-language badge (Complete · n/total · Missing). Presentational.
 */
export function TranslationCoverage({ coverage }: { coverage: Record<string, LocaleCoverage> }) {
  const targets = translationTabOrder.filter((l): l is Locale => l !== "en");
  const overall = Math.round(targets.reduce((sum, l) => sum + (coverage[l]?.percent ?? 0), 0) / targets.length);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Coverage</span>
        <span className="text-xs font-bold text-ink">{overall}% overall</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {targets.map((l) => {
          const c = coverage[l] ?? EMPTY;
          const tone = c.complete
            ? "border-[#bfe3ce] bg-[#e4f3eb] text-[#0f6b43]"
            : c.exists && c.filled > 0
              ? "border-[#f0deb0] bg-[#fbf2de] text-[#9a5a00]"
              : "border-line-input bg-surface-2 text-faint";
          return (
            <span
              key={l}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
            >
              <span aria-hidden>{localeFlags[l]}</span>
              {localeNames[l].english} · {coverageLabel(c)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
