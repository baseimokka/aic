"use client";

import { useState, useTransition } from "react";
import type { PaymentStatus } from "@prisma/client";
import { updateLeadFinancials } from "@/app/[locale]/(admin)/dashboard/leads/actions";
import { SELECTABLE_PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from "@/lib/leads/labels";
import { formatMoney } from "@/lib/utils";
import { PaymentStatusPill } from "@/components/admin/pills";

type SelectablePaymentStatus = (typeof SELECTABLE_PAYMENT_STATUSES)[number];

const SEGMENT_ACTIVE: Record<SelectablePaymentStatus, string> = {
  UNPAID: "border-[#f3c9c4] bg-[#fbeae8] text-[#b3261e]",
  PAID_IN_FULL: "border-[#bfe3ce] bg-[#e4f3eb] text-[#0f6b43]",
};

export interface FinancialsValue {
  /** Per-person price of the chosen tour; null when the lead has no tour. */
  pricePerPerson: number | null;
  /** ISO 4217 code; the offered set is managed in Settings. */
  currency: string;
  travelers: number;
  paymentStatus: PaymentStatus;
}

/**
 * Phase-1 financials: trip price (the tour's per-person price) and the total
 * (price × travelers) are read-only and derive from the chosen tour. The only
 * editable field is the two-state paid/unpaid marker.
 */
export function LeadFinancials({
  leadId,
  initial,
  canEdit,
}: {
  leadId: string;
  initial: FinancialsValue;
  canEdit: boolean;
}) {
  // Legacy DEPOSIT_PAID rows collapse to Unpaid — deposit is no longer tracked.
  const [payment, setPayment] = useState<SelectablePaymentStatus>(
    initial.paymentStatus === "PAID_IN_FULL" ? "PAID_IN_FULL" : "UNPAID",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const { pricePerPerson, currency, travelers } = initial;
  const total = pricePerPerson !== null ? pricePerPerson * travelers : null;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateLeadFinancials(leadId, { paymentStatus: payment });
      if (!result.ok) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
          Financials{" "}
          <span className="font-semibold normal-case tracking-normal text-faint">
            · no online payment (Phase 1) · priced from tour
          </span>
        </span>
        <PaymentStatusPill status={payment} />
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Trip price</dt>
          <dd className="text-[17px] font-extrabold tabular-nums text-ink">
            {pricePerPerson !== null ? formatMoney(pricePerPerson, currency) : "—"}
          </dd>
          <dd className="mt-0.5 text-[10px] text-faint">per person · from tour</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-accent-deep">Total price</dt>
          <dd className="text-[19px] font-extrabold tabular-nums text-ink">
            {total !== null ? formatMoney(total, currency) : "—"}
          </dd>
          <dd className="mt-0.5 text-[10px] text-success-deep">
            {total !== null
              ? `${travelers} traveler${travelers === 1 ? "" : "s"} × ${formatMoney(pricePerPerson as number, currency)}`
              : "no tour selected"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Payment</dt>
          <dd className="text-[17px] font-extrabold text-ink">{PAYMENT_STATUS_LABELS[payment]}</dd>
        </div>
      </dl>

      {canEdit ? (
        <>
          <div className="mb-4 h-px bg-line-soft" />
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
              Payment status
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Payment status">
              {SELECTABLE_PAYMENT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={payment === s}
                  onClick={() => setPayment(s)}
                  className={`h-11 flex-1 whitespace-nowrap rounded-[9px] border-[1.5px] px-2 text-[12.5px] font-bold ${
                    payment === s ? SEGMENT_ACTIVE[s] : "border-line-input bg-white text-muted hover:bg-cream"
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex h-11 items-center rounded-[9px] bg-ink px-5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save payment status"}
            </button>
            <span role="status" aria-live="polite" className="text-xs font-semibold">
              {error ? <span className="text-danger">{error}</span> : null}
              {saved && !error ? <span className="text-success-deep">Saved</span> : null}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
