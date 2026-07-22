"use client";

import { useCallback, useRef, useState } from "react";
import { SaveBar } from "@/components/admin/controls";
import { localeNames, localeFlags, type Locale } from "@/lib/i18n/config";
import { entityConfig, type FieldValue, type FieldValues, type TranslatableEntityType } from "@/lib/translation/registry";
import { computeCoverage, coverageLabel, type LocaleCoverage } from "@/lib/translation/coverage";
import { getTranslation, upsertTranslation } from "@/lib/translation/actions";
import { TranslationTabs } from "./tabs";
import { TranslationForm } from "./form";
import { TranslationSidebar } from "./sidebar";
import { TranslationCoverage } from "./coverage";

/**
 * The Manual Translation editor. Split layout: English source (read-only) on the
 * left, the selected language (editable) on the right. The default language is
 * preloaded by the server; every other language is fetched on demand the first
 * time its tab is opened, then cached. Only the selected locale is ever saved —
 * the others are never touched.
 */
export function TranslationEditor({
  entityType,
  entityId,
  englishValues,
  initialLocale,
  initialValues,
  initialCoverage,
  canEdit,
}: {
  entityType: TranslatableEntityType;
  entityId: string;
  englishValues: FieldValues;
  initialLocale: Locale;
  initialValues: FieldValues;
  initialCoverage: Record<string, LocaleCoverage>;
  canEdit: boolean;
}) {
  const config = entityConfig(entityType);
  // Per-locale cache of loaded values — read/written only in event handlers.
  const cacheRef = useRef<Record<string, FieldValues>>({ en: englishValues, [initialLocale]: initialValues });

  const [selected, setSelected] = useState<Locale>(initialLocale);
  const [coverage, setCoverage] = useState<Record<string, LocaleCoverage>>(initialCoverage);
  const [draft, setDraft] = useState<FieldValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isSource = selected === "en";

  // Switching tabs is user-driven (no effect) — lazy-fetch a locale once, then cache.
  const selectLocale = useCallback(
    (locale: Locale) => {
      setSelected(locale);
      setError(null);
      setSaved(false);
      setPending(false);

      if (locale === "en") {
        setDraft(englishValues);
        return;
      }
      const cached = cacheRef.current[locale];
      if (cached) {
        setDraft({ ...cached });
        return;
      }
      setLoading(true);
      getTranslation(entityType, entityId, locale).then((res) => {
        setLoading(false);
        if (!res.ok) {
          setError(res.error);
          setDraft({});
          return;
        }
        cacheRef.current[locale] = res.values;
        setDraft({ ...res.values });
      });
    },
    [englishValues, entityType, entityId],
  );

  const onChange = useCallback((name: string, value: FieldValue) => {
    setDraft((d) => ({ ...d, [name]: value }));
    setSaved(false);
  }, []);

  function save() {
    const locale = selected;
    const snapshot = draft;
    setPending(true);
    setError(null);
    setSaved(false);
    upsertTranslation(entityType, entityId, locale, snapshot).then((res) => {
      setPending(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      cacheRef.current[locale] = snapshot;
      setCoverage((cov) => ({ ...cov, [locale]: computeCoverage(config, snapshot) }));
    });
  }

  function cancel() {
    setDraft({ ...(cacheRef.current[selected] ?? {}) });
    setError(null);
    setSaved(false);
  }

  const selectedCoverage = coverage[selected];

  return (
    <section
      id="translations"
      className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-ink">Translations</h3>
          <p className="mt-1 text-[13px] text-muted">
            English is the source. Add each language by hand — one language is saved at a time.
          </p>
        </div>
        <div className="min-w-[220px]">
          <TranslationCoverage coverage={coverage} />
        </div>
      </div>

      <TranslationTabs selected={selected} onSelect={selectLocale} coverage={coverage} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* LEFT — English source (read-only) */}
        <div className="rounded-xl border border-line-soft bg-cream/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink">
            <span aria-hidden>{localeFlags.en}</span> English
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              Source · read only
            </span>
          </div>
          <TranslationSidebar config={config} values={englishValues} />
        </div>

        {/* RIGHT — selected language */}
        <div className="rounded-xl border border-line-soft bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink">
            <span aria-hidden>{localeFlags[selected]}</span>
            {localeNames[selected].english}
            {!isSource && selectedCoverage ? (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                {coverageLabel(selectedCoverage)}
              </span>
            ) : null}
          </div>

          {isSource ? (
            <div>
              <p className="mb-3 rounded-lg border border-line-soft bg-cream/50 px-3 py-2 text-[12px] text-muted">
                English is edited in the content form above — it is shown here for reference only.
              </p>
              <TranslationSidebar config={config} values={englishValues} />
            </div>
          ) : loading ? (
            <div className="space-y-3" aria-busy>
              {config.fields.map((f) => (
                <div key={f.name} className="h-10 animate-pulse rounded-[10px] bg-surface-2" />
              ))}
            </div>
          ) : canEdit ? (
            <div className="space-y-5">
              <TranslationForm config={config} values={draft} disabled={pending} onChange={onChange} />
              <SaveBar
                pending={pending}
                saved={saved}
                error={error}
                onSave={save}
                onCancel={cancel}
                saveLabel={`Save ${localeNames[selected].english}`}
              />
            </div>
          ) : (
            <div>
              <p className="mb-3 rounded-lg border border-line-soft bg-cream/50 px-3 py-2 text-[12px] text-muted">
                You have read-only access to translations.
              </p>
              <TranslationSidebar config={config} values={draft} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
