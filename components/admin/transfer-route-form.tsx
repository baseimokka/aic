"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, SelectField, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import {
  createTransferRoute,
  updateTransferRoute,
} from "@/app/[locale]/(admin)/dashboard/transfers/pricing/actions";

export interface RouteOption {
  id: string;
  name: string;
}

export interface TransferRouteFormValues {
  fromLocationId: string;
  toLocationId: string;
  /** Empty string = any vehicle (the route's default price). */
  vehicleId: string;
  price: number;
  currency: string;
}

export function TransferRouteForm({
  mode,
  id,
  initial,
  locations,
  vehicles,
  currencies,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: TransferRouteFormValues;
  locations: RouteOption[];
  vehicles: RouteOption[];
  currencies: string[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof TransferRouteFormValues>(key: K, val: TransferRouteFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        fromLocationId: v.fromLocationId,
        toLocationId: v.toLocationId,
        vehicleId: v.vehicleId || null,
        price: v.price,
        currency: v.currency,
      };
      const res = mode === "create" ? await createTransferRoute(payload) : await updateTransferRoute(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push("/en/dashboard/transfers/pricing");
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard
        title="Route"
        description="Directions are priced independently — Airport → Makadi and Makadi → Airport are two records."
      >
        <FormGrid>
          <Field label="Pickup from" htmlFor="tr-from" required>
            <SelectField id="tr-from" value={v.fromLocationId} onChange={(e) => set("fromLocationId", e.target.value)}>
              <option value="">Select…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Destination" htmlFor="tr-to" required>
            <SelectField id="tr-to" value={v.toLocationId} onChange={(e) => set("toLocationId", e.target.value)}>
              <option value="">Select…</option>
              {locations
                .filter((l) => l.id !== v.fromLocationId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </SelectField>
          </Field>
        </FormGrid>
        <Field
          label="Vehicle"
          htmlFor="tr-vehicle"
          hint="“Any vehicle” sets the route's default price; a vehicle-specific price overrides it."
        >
          <SelectField id="tr-vehicle" value={v.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
            <option value="">Any vehicle</option>
            {vehicles.map((veh) => (
              <option key={veh.id} value={veh.id}>
                {veh.name}
              </option>
            ))}
          </SelectField>
        </Field>
      </FormCard>

      <FormCard title="Price" description="What the customer pays for the whole vehicle, one way.">
        <FormGrid>
          <Field label="Price" htmlFor="tr-price" required>
            <TextInput
              id="tr-price"
              type="number"
              min={0}
              step="0.01"
              value={v.price}
              onChange={(e) => set("price", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Currency" htmlFor="tr-currency">
            <SelectField id="tr-currency" value={v.currency} onChange={(e) => set("currency", e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </Field>
        </FormGrid>
      </FormCard>

      <SaveBar
        pending={pending}
        saved={saved}
        error={error}
        onSave={submit}
        onCancel={() => router.push("/en/dashboard/transfers/pricing")}
      />
    </div>
  );
}
