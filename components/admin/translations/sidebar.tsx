import type { FieldValues, TranslatableEntityConfig } from "@/lib/translation/registry";

/**
 * Read-only rendering of one locale's values (used for the English source
 * reference on the left, and to show a locale when the actor cannot edit).
 * Presentational — no hooks.
 */
export function TranslationSidebar({
  config,
  values,
}: {
  config: TranslatableEntityConfig;
  values: FieldValues;
}) {
  return (
    <div className="space-y-4">
      {config.fields.map((f) => {
        const v = values[f.name];
        const list = Array.isArray(v) ? v : null;
        const text = typeof v === "string" ? v : "";
        return (
          <div key={f.name}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">{f.label}</div>
            {f.kind === "list" ? (
              list && list.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {list.map((item, i) => (
                    <li
                      key={`${item}-${i}`}
                      className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[13px] font-semibold text-ink"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-faint">—</p>
              )
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-soft">
                {text.trim() ? text : "—"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
