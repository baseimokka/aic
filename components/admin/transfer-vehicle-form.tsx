"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import {
  createTransferVehicle,
  updateTransferVehicle,
} from "@/app/[locale]/(admin)/dashboard/transfers/vehicles/actions";

export interface TransferVehicleFormValues {
  name: string;
  capacity: number;
  active: boolean;
}

export function TransferVehicleForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: TransferVehicleFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof TransferVehicleFormValues>(key: K, val: TransferVehicleFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = { name: v.name, capacity: v.capacity, active: v.active };
      const res = mode === "create" ? await createTransferVehicle(payload) : await updateTransferVehicle(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push("/en/dashboard/transfers/vehicles");
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard>
        <FormGrid>
          <Field label="Name" htmlFor="tv-name" required hint="Shown to visitors on the transfer form.">
            <TextInput
              id="tv-name"
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Private car"
            />
          </Field>
          <Field label="Capacity" htmlFor="tv-capacity" required hint="Maximum passengers.">
            <TextInput
              id="tv-capacity"
              type="number"
              min={1}
              max={200}
              value={v.capacity}
              onChange={(e) => set("capacity", Number(e.target.value) || 0)}
            />
          </Field>
        </FormGrid>
        <ToggleRow
          title="Active"
          description="Inactive vehicles are hidden from the public transfer form."
          checked={v.active}
          onChange={(next) => set("active", next)}
        />
      </FormCard>

      <SaveBar
        pending={pending}
        saved={saved}
        error={error}
        onSave={submit}
        onCancel={() => router.push("/en/dashboard/transfers/vehicles")}
      />
    </div>
  );
}
