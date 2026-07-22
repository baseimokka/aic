"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@prisma/client";
import { assignLead, updateLeadStatus } from "@/app/[locale]/(admin)/dashboard/leads/actions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/leads/labels";
import { Avatar } from "@/components/admin/avatar";
import { ROLE_LABELS } from "@/components/admin/admin-shell";
import type { Role } from "@prisma/client";

const SELECT_TINTS: Record<LeadStatus, string> = {
  NEW: "border-[#cadef1] bg-[#eaf1f9] text-[#2f6db0]",
  CONTACTED: "border-[#f0deb0] bg-[#fbf2de] text-[#9a5a00]",
  NEGOTIATING: "border-[#f6cdb8] bg-[#fcebe2] text-[#c0511f]",
  CONFIRMED: "border-[#bfe3ce] bg-[#e4f3eb] text-[#0f6b43]",
  CANCELLED: "border-line-input bg-surface-2 text-ink-soft",
};

export interface StaffOption {
  id: string;
  name: string;
  role: Role;
}

/** Right-column pipeline card: five-status select + manual (re)assignment. */
export function LeadStatusCard({
  leadId,
  status,
  assignedStaffId,
  staff,
  canEdit,
}: {
  leadId: string;
  status: LeadStatus;
  assignedStaffId: string | null;
  staff: StaffOption[];
  canEdit: boolean;
}) {
  const [current, setCurrent] = useState<LeadStatus>(status);
  const [assignee, setAssignee] = useState<string>(assignedStaffId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = staff.find((s) => s.id === assignee) ?? null;

  function changeStatus(next: LeadStatus) {
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, next);
      if (!result.ok) {
        setCurrent(previous);
        setError(result.error);
      }
    });
  }

  function changeAssignee(nextId: string) {
    const previous = assignee;
    setAssignee(nextId);
    setError(null);
    startTransition(async () => {
      const result = await assignLead(leadId, nextId || null);
      if (!result.ok) {
        setAssignee(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-line bg-white px-5 py-4 shadow-card">
      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Status</div>
      {canEdit ? (
        <select
          aria-label="Lead status"
          value={current}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as LeadStatus)}
          className={`h-12 w-full rounded-[10px] border-[1.5px] px-3 text-sm font-bold outline-none focus-visible:outline-3 focus-visible:outline-accent ${SELECT_TINTS[current]}`}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      ) : (
        <div className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-bold ${SELECT_TINTS[current]}`}>
          {LEAD_STATUS_LABELS[current]}
        </div>
      )}

      <div className="mb-2.5 mt-5 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
        Assigned to
      </div>
      <div className="flex items-center gap-2.5">
        <Avatar name={selected?.name ?? "?"} seed={selected?.id} size={34} muted={!selected} />
        <div className="min-w-0 flex-1">
          {canEdit ? (
            <select
              aria-label="Assigned staff member"
              value={assignee}
              disabled={pending}
              onChange={(e) => changeAssignee(e.target.value)}
              className="h-11 w-full rounded-[9px] border-[1.5px] border-line-input bg-white px-2.5 text-sm font-semibold text-ink outline-none focus-visible:outline-3 focus-visible:outline-accent"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {ROLE_LABELS[s.role]}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="truncate text-sm font-bold text-ink">{selected?.name ?? "Unassigned"}</div>
              {selected ? <div className="text-xs text-faint">{ROLE_LABELS[selected.role]}</div> : null}
            </>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
