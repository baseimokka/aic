"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, SelectField, TextInput, FormCard } from "@/components/admin/form";
import { IconArchive } from "@/components/admin/icons";
import { upsertAssignment, clearAssignment } from "@/app/[locale]/(admin)/dashboard/assignments/actions";

export interface AssignmentOption {
  id: string;
  label: string;
}

export interface AssignmentFormValues {
  guideId: string;
  vehicleId: string;
  scheduledDate: string; // "YYYY-MM-DD" or ""
}

export function AssignmentForm({
  leadId,
  canEdit,
  hasAssignment,
  guides,
  vehicles,
  initial,
}: {
  leadId: string;
  canEdit: boolean;
  hasAssignment: boolean;
  guides: AssignmentOption[];
  vehicles: AssignmentOption[];
  initial: AssignmentFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof AssignmentFormValues>(key: K, val: AssignmentFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await upsertAssignment(leadId, {
        guideId: v.guideId || null,
        vehicleId: v.vehicleId || null,
        scheduledDate: v.scheduledDate || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await clearAssignment(leadId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setConfirmRemove(false);
      router.push("/en/dashboard/assignments");
    });
  }

  return (
    <div className="space-y-5">
      <FormCard
        title="Guide & vehicle"
        description="Assign a guide and a vehicle, and set the date the trip runs."
      >
        <Field label="Guide" htmlFor="asg-guide" hint={guides.length ? undefined : "No active guides — add one in Guides first."}>
          <SelectField
            id="asg-guide"
            value={v.guideId}
            disabled={!canEdit}
            onChange={(e) => set("guideId", e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </SelectField>
        </Field>

        <Field label="Vehicle" htmlFor="asg-vehicle" hint={vehicles.length ? undefined : "No active vehicles — add one in Vehicles first."}>
          <SelectField
            id="asg-vehicle"
            value={v.vehicleId}
            disabled={!canEdit}
            onChange={(e) => set("vehicleId", e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {vehicles.map((veh) => (
              <option key={veh.id} value={veh.id}>
                {veh.label}
              </option>
            ))}
          </SelectField>
        </Field>

        <Field label="Scheduled date" htmlFor="asg-date" hint="The date this trip runs." className="max-w-[240px]">
          <TextInput
            id="asg-date"
            type="date"
            value={v.scheduledDate}
            disabled={!canEdit}
            onChange={(e) => set("scheduledDate", e.target.value)}
          />
        </Field>
      </FormCard>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex h-11 items-center rounded-[10px] bg-ink px-6 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : hasAssignment ? "Update assignment" : "Save assignment"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/en/dashboard/assignments")}
            disabled={pending}
            className="inline-flex h-11 items-center rounded-[10px] border-[1.5px] border-line-input bg-white px-5 text-[13px] font-bold text-ink-soft hover:bg-cream disabled:opacity-60"
          >
            Cancel
          </button>

          {hasAssignment ? (
            confirmRemove ? (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="inline-flex h-11 items-center rounded-[10px] bg-[#9a5a00] px-4 text-[13px] font-bold text-white hover:brightness-95 disabled:opacity-60"
                >
                  {pending ? "Removing…" : "Confirm remove"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  disabled={pending}
                  className="text-[13px] font-bold text-muted hover:text-ink"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={pending}
                className="ms-auto inline-flex h-11 items-center gap-1.5 rounded-[10px] border-[1.5px] border-[#f0deb0] bg-white px-4 text-[13px] font-bold text-[#9a5a00] hover:bg-warning-soft disabled:opacity-60"
              >
                <IconArchive width={15} height={15} />
                Remove assignment
              </button>
            )
          ) : null}

          <span role="status" aria-live="polite" className="text-xs font-semibold">
            {error ? <span className="text-danger">{error}</span> : null}
            {saved && !error ? <span className="text-success-deep">Saved</span> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
