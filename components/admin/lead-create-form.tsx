"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, SelectField, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { MANUAL_LEAD_SOURCES, LEAD_SOURCE_LABELS } from "@/lib/leads/labels";
import type { ManualLeadSource } from "@/lib/validation/lead";
import { createManualLead } from "@/app/[locale]/(admin)/dashboard/leads/actions";

export interface TourOption {
  id: string;
  title: string;
}

interface LeadCreateValues {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  tourId: string;
  preferredDate: string;
  adults: number;
  children: number;
  source: ManualLeadSource;
  notes: string;
}

const INITIAL: LeadCreateValues = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  tourId: "",
  preferredDate: "",
  adults: 1,
  children: 0,
  source: "whatsapp",
  notes: "",
};

/**
 * Manual "New lead" form (Sales). Mirrors the website booking-request shape so
 * the created lead is indistinguishable from a website lead in the CRM — only
 * the source records the channel it arrived through.
 */
export function LeadCreateForm({ tours }: { tours: TourOption[] }) {
  const router = useRouter();
  const [v, setV] = useState(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const todayIso = new Date().toISOString().slice(0, 10); // date input floor

  function set<K extends keyof LeadCreateValues>(key: K, val: LeadCreateValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createManualLead({
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        country: v.country,
        tourId: v.tourId || null,
        preferredDate: v.preferredDate || undefined,
        adults: v.adults,
        children: v.children,
        source: v.source,
        notes: v.notes || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.id ? `/en/dashboard/leads/${res.id}` : "/en/dashboard/leads");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard title="Customer" description="Who reached out, and how we can contact them.">
        <Field label="Full name" htmlFor="ml-name" required>
          <TextInput
            id="ml-name"
            value={v.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            autoComplete="off"
          />
        </Field>
        <FormGrid>
          <Field label="Phone" htmlFor="ml-phone" required hint="Ideally a number active on WhatsApp.">
            <TextInput
              id="ml-phone"
              type="tel"
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Email" htmlFor="ml-email" hint="Optional — WhatsApp or phone contacts may not have one.">
            <TextInput
              id="ml-email"
              type="email"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Country" htmlFor="ml-country" required>
            <TextInput
              id="ml-country"
              value={v.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Germany"
            />
          </Field>
          <Field label="Source" htmlFor="ml-source" required hint="The channel the enquiry arrived through.">
            <SelectField
              id="ml-source"
              value={v.source}
              onChange={(e) => set("source", e.target.value as ManualLeadSource)}
            >
              {MANUAL_LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard title="Trip" description="What they're interested in — everything here is optional except travelers.">
        <Field label="Interested tour" htmlFor="ml-tour">
          <SelectField id="ml-tour" value={v.tourId} onChange={(e) => set("tourId", e.target.value)}>
            <option value="">No specific tour</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </SelectField>
        </Field>
        <FormGrid>
          <Field label="Travel date" htmlFor="ml-date">
            <TextInput
              id="ml-date"
              type="date"
              min={todayIso}
              value={v.preferredDate}
              onChange={(e) => set("preferredDate", e.target.value)}
            />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Adults" htmlFor="ml-adults" required>
            <TextInput
              id="ml-adults"
              type="number"
              min={1}
              max={40}
              value={v.adults}
              onChange={(e) => set("adults", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Children" htmlFor="ml-children">
            <TextInput
              id="ml-children"
              type="number"
              min={0}
              max={20}
              value={v.children}
              onChange={(e) => set("children", Number(e.target.value) || 0)}
            />
          </Field>
        </FormGrid>
        <Field
          label="Notes"
          htmlFor="ml-notes"
          hint="Saved as the lead's first internal note."
        >
          <TextArea
            id="ml-notes"
            rows={3}
            value={v.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="What was discussed, special requests, budget…"
          />
        </Field>
      </FormCard>

      <SaveBar
        pending={pending}
        saved={false}
        error={error}
        onSave={submit}
        onCancel={() => router.push("/en/dashboard/leads")}
        saveLabel="Create lead"
      />
    </div>
  );
}
