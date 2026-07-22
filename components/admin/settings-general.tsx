"use client";

import { useState, useTransition } from "react";
import {
  updateSettings,
  addCurrency as addCurrencyAction,
  removeCurrency as removeCurrencyAction,
} from "@/app/[locale]/(admin)/dashboard/settings/actions";
import { Toggle } from "@/components/admin/controls";
import { IconClose } from "@/components/admin/icons";

/** Friendly labels for common codes; anything else displays as the plain code. */
const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  EGP: "Egyptian Pound",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  CHF: "Swiss Franc",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  TRY: "Turkish Lira",
  RUB: "Russian Ruble",
};

function currencyLabel(code: string): string {
  const name = CURRENCY_NAMES[code];
  return name ? `${code} — ${name}` : code;
}

export function SettingsGeneral({
  initial,
  staff,
}: {
  initial: {
    defaultCurrency: string;
    currencies: string[];
    allowPerLeadCurrencyOverride: boolean;
    fallbackAssigneeId: string | null;
  };
  staff: Array<{ id: string; name: string }>;
}) {
  const [currency, setCurrency] = useState(initial.defaultCurrency);
  const [currencies, setCurrencies] = useState<string[]>(initial.currencies);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [allowOverride, setAllowOverride] = useState(initial.allowPerLeadCurrencyOverride);
  const [fallback, setFallback] = useState(initial.fallbackAssigneeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [listPending, startListTransition] = useTransition();

  // Add/Remove persist immediately via their server actions — the list must
  // survive navigating away, not sit staged behind "Save changes".
  function addCurrency() {
    const code = draft.trim().toUpperCase();
    if (!code) return;
    if (!/^[A-Z]{3}$/.test(code)) {
      setDraftError("Use a 3-letter currency code (e.g. EGP).");
      return;
    }
    if (currencies.includes(code)) {
      setDraftError(`${code} is already in the list.`);
      return;
    }
    setDraftError(null);
    startListTransition(async () => {
      const result = await addCurrencyAction(code);
      if (!result.ok) {
        setDraftError(result.error);
        return;
      }
      setCurrencies((prev) => (prev.includes(code) ? prev : [...prev, code]));
      setDraft("");
    });
  }

  function removeCurrency(code: string) {
    if (code === currency) {
      setDraftError("Pick a different default currency before removing this one.");
      return;
    }
    setDraftError(null);
    startListTransition(async () => {
      const result = await removeCurrencyAction(code);
      if (!result.ok) {
        setDraftError(result.error);
        return;
      }
      setCurrencies((prev) => prev.filter((c) => c !== code));
    });
  }

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSettings({
        defaultCurrency: currency,
        currencies,
        allowPerLeadCurrencyOverride: allowOverride,
        fallbackAssigneeId: fallback || null,
      });
      if (!result.ok) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
      <h3 className="mb-4 text-sm font-extrabold text-ink">General</h3>

      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
        Currencies
      </span>
      <ul className="mb-2 flex flex-wrap gap-1.5">
        {currencies.map((code) => (
          <li
            key={code}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 ps-2.5 pe-1 text-[13px] font-semibold text-ink"
          >
            {currencyLabel(code)}
            <button
              type="button"
              aria-label={`Remove ${code}`}
              disabled={listPending}
              onClick={() => removeCurrency(code)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-white hover:text-ink disabled:opacity-60"
            >
              <IconClose width={13} height={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          type="text"
          aria-label="New currency code"
          value={draft}
          maxLength={3}
          placeholder="Add a currency code (e.g. EGP)"
          onChange={(e) => {
            setDraft(e.target.value.toUpperCase());
            setDraftError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCurrency();
            }
          }}
          className="h-11 w-full max-w-[280px] rounded-[10px] border-[1.5px] border-line-input bg-white px-3 text-sm font-bold uppercase text-ink outline-none placeholder:font-normal placeholder:normal-case focus:border-accent"
        />
        <button
          type="button"
          disabled={listPending}
          onClick={addCurrency}
          className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink hover:bg-cream disabled:opacity-60"
        >
          {listPending ? "Saving…" : "Add"}
        </button>
      </div>
      {draftError ? <p className="mt-1.5 text-xs font-semibold text-danger">{draftError}</p> : null}
      <p className="mt-1.5 text-[11px] text-faint">
        These currencies are offered on tours and leads. Adding or removing saves immediately.
      </p>

      <div className="mt-4 border-t border-line-soft pt-4">
        <label htmlFor="set-currency" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Default currency
        </label>
        <select
          id="set-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3 text-sm font-bold text-ink outline-none focus:border-accent"
        >
          {currencies.map((code) => (
            <option key={code} value={code}>
              {currencyLabel(code)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-faint">Symbol shown before the amount ($1,390). No live FX (Phase 1).</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
        <div>
          <div className="text-sm font-semibold text-ink">Allow per-lead currency override</div>
          <div className="text-xs text-faint">Sales may set any listed currency on an individual lead.</div>
        </div>
        <Toggle checked={allowOverride} onChange={setAllowOverride} label="Allow per-lead currency override" />
      </div>

      <div className="mt-4 border-t border-line-soft pt-4">
        <label htmlFor="set-fallback" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Fallback assignee
        </label>
        <select
          id="set-fallback"
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          className="h-12 w-full rounded-[10px] border-[1.5px] border-line-input bg-white px-3 text-sm font-semibold text-ink outline-none focus:border-accent"
        >
          <option value="">No fallback — leave unmatched leads unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-faint">Receives every lead no assignment rule claims.</p>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-[9px] bg-ink px-5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <span role="status" aria-live="polite" className="text-xs font-semibold">
          {error ? <span className="text-danger">{error}</span> : null}
          {saved && !error ? <span className="text-success-deep">Saved</span> : null}
        </span>
      </div>
    </div>
  );
}
