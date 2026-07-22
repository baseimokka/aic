"use client";

/**
 * Small shared interactive controls used across admin forms (§10). Client
 * components because they take event-handler props from client parents.
 */

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] flex-shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
        checked ? "border-success-deep bg-success" : "border-line-input bg-line-input"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
          checked ? "start-[22px]" : "start-[2px]"
        }`}
      />
    </button>
  );
}

/** A labelled toggle row (title + description on the start, switch on the end). */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        {description ? <div className="text-xs text-faint">{description}</div> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

/** Sticky save/cancel row with inline status — reused by every content editor. */
export function SaveBar({
  pending,
  saved,
  error,
  onSave,
  onCancel,
  saveLabel = "Save",
}: {
  pending: boolean;
  saved: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="inline-flex h-11 items-center rounded-[10px] bg-ink px-6 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="inline-flex h-11 items-center rounded-[10px] border-[1.5px] border-line-input bg-white px-5 text-[13px] font-bold text-ink-soft hover:bg-cream disabled:opacity-60"
      >
        Cancel
      </button>
      <span role="status" aria-live="polite" className="text-xs font-semibold">
        {error ? <span className="text-danger">{error}</span> : null}
        {saved && !error ? <span className="text-success-deep">Saved</span> : null}
      </span>
    </div>
  );
}
