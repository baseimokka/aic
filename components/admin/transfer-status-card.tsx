"use client";

import { useState, useTransition } from "react";
import type { TransferRequestStatus } from "@prisma/client";
import { updateTransferStatus } from "@/app/[locale]/(admin)/dashboard/transfers/actions";
import { TRANSFER_STATUSES, TRANSFER_STATUS_LABELS } from "@/lib/transfers/labels";

const SELECT_TINTS: Record<TransferRequestStatus, string> = {
  NEW: "border-[#cadef1] bg-[#eaf1f9] text-[#2f6db0]",
  CONTACTED: "border-[#f0deb0] bg-[#fbf2de] text-[#9a5a00]",
  CONFIRMED: "border-[#bfe3ce] bg-[#e4f3eb] text-[#0f6b43]",
  CANCELLED: "border-line-input bg-surface-2 text-ink-soft",
};

/** Right-column pipeline card for a transfer request (mirrors LeadStatusCard). */
export function TransferStatusCard({
  requestId,
  status,
  canEdit,
}: {
  requestId: string;
  status: TransferRequestStatus;
  canEdit: boolean;
}) {
  const [current, setCurrent] = useState<TransferRequestStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function changeStatus(next: TransferRequestStatus) {
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await updateTransferStatus(requestId, next);
      if (!result.ok) {
        setCurrent(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Status</div>
      {canEdit ? (
        <select
          aria-label="Transfer request status"
          value={current}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as TransferRequestStatus)}
          className={`h-12 w-full rounded-[10px] border-[1.5px] px-3 text-sm font-bold outline-none focus-visible:outline-3 focus-visible:outline-accent ${SELECT_TINTS[current]}`}
        >
          {TRANSFER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {TRANSFER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      ) : (
        <div className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-bold ${SELECT_TINTS[current]}`}>
          {TRANSFER_STATUS_LABELS[current]}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
