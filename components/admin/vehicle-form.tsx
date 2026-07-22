"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VehicleStatus } from "@prisma/client";
import { Field, TextInput, SelectField, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { VEHICLE_STATUSES, VEHICLE_STATUS_LABELS } from "@/lib/operations/labels";
import { createVehicle, updateVehicle } from "@/app/[locale]/(admin)/dashboard/vehicles/actions";

export interface VehicleFormValues {
  name: string;
  type: string;
  capacity: number;
  status: VehicleStatus;
}

export function VehicleForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: VehicleFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof VehicleFormValues>(key: K, val: VehicleFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        name: v.name,
        type: v.type,
        capacity: v.capacity,
        status: v.status,
      };
      const res = mode === "create" ? await createVehicle(payload) : await updateVehicle(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push("/en/dashboard/vehicles");
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard>
        <Field label="Name" htmlFor="veh-name" required hint="A label operations recognises, e.g. plate or nickname.">
          <TextInput
            id="veh-name"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Toyota Hiace · ABC-1234"
          />
        </Field>
        <FormGrid>
          <Field label="Type" htmlFor="veh-type" required>
            <TextInput
              id="veh-type"
              value={v.type}
              onChange={(e) => set("type", e.target.value)}
              placeholder="Minibus"
            />
          </Field>
          <Field label="Capacity" htmlFor="veh-capacity" required hint="Maximum passengers.">
            <TextInput
              id="veh-capacity"
              type="number"
              min={1}
              max={200}
              value={v.capacity}
              onChange={(e) => set("capacity", Number(e.target.value) || 0)}
            />
          </Field>
        </FormGrid>
        <Field label="Status" htmlFor="veh-status" className="max-w-[240px]">
          <SelectField
            id="veh-status"
            value={v.status}
            onChange={(e) => set("status", e.target.value as VehicleStatus)}
          >
            {VEHICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {VEHICLE_STATUS_LABELS[s]}
              </option>
            ))}
          </SelectField>
        </Field>
      </FormCard>

      <SaveBar
        pending={pending}
        saved={saved}
        error={error}
        onSave={submit}
        onCancel={() => router.push("/en/dashboard/vehicles")}
      />
    </div>
  );
}
