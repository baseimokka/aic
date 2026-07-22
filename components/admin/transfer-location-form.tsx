"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, FormCard } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import {
  createTransferLocation,
  updateTransferLocation,
} from "@/app/[locale]/(admin)/dashboard/transfers/locations/actions";

export interface TransferLocationFormValues {
  name: string;
  active: boolean;
}

export function TransferLocationForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: TransferLocationFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof TransferLocationFormValues>(key: K, val: TransferLocationFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = { name: v.name, active: v.active };
      const res = mode === "create" ? await createTransferLocation(payload) : await updateTransferLocation(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push("/en/dashboard/transfers/locations");
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard>
        <Field label="Name" htmlFor="tl-name" required hint="Shown to visitors as a pickup / drop-off option.">
          <TextInput
            id="tl-name"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Hurghada Airport"
          />
        </Field>
        <ToggleRow
          title="Active"
          description="Inactive locations are hidden from the public transfer form."
          checked={v.active}
          onChange={(next) => set("active", next)}
        />
      </FormCard>

      <SaveBar
        pending={pending}
        saved={saved}
        error={error}
        onSave={submit}
        onCancel={() => router.push("/en/dashboard/transfers/locations")}
      />
    </div>
  );
}
