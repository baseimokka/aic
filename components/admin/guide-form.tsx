"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GuideAvailability } from "@prisma/client";
import { Field, TextInput, SelectField, FormCard } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { TagInput } from "@/components/admin/tag-input";
import { GUIDE_AVAILABILITIES, GUIDE_AVAILABILITY_LABELS } from "@/lib/operations/labels";
import { createGuide, updateGuide } from "@/app/[locale]/(admin)/dashboard/guides/actions";

export interface GuideFormValues {
  name: string;
  languages: string[];
  contact: string;
  availabilityStatus: GuideAvailability;
}

export function GuideForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: GuideFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof GuideFormValues>(key: K, val: GuideFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        name: v.name,
        languages: v.languages,
        contact: v.contact,
        availabilityStatus: v.availabilityStatus,
      };
      const res = mode === "create" ? await createGuide(payload) : await updateGuide(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push("/en/dashboard/guides");
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard>
        <Field label="Name" htmlFor="guide-name" required>
          <TextInput
            id="guide-name"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Mahmoud El-Sayed"
          />
        </Field>
        <Field
          label="Languages"
          htmlFor="guide-langs"
          hint="Press Enter or comma after each language the guide leads tours in."
        >
          <TagInput
            value={v.languages}
            onChange={(next) => set("languages", next)}
            ariaLabel="Guide languages"
            placeholder="English, Arabic, German…"
          />
        </Field>
        <Field label="Contact" htmlFor="guide-contact" hint="Phone or email used to reach the guide.">
          <TextInput
            id="guide-contact"
            value={v.contact}
            onChange={(e) => set("contact", e.target.value)}
            placeholder="+20 100 000 0000"
          />
        </Field>
        <Field label="Availability" htmlFor="guide-avail" className="max-w-[240px]">
          <SelectField
            id="guide-avail"
            value={v.availabilityStatus}
            onChange={(e) => set("availabilityStatus", e.target.value as GuideAvailability)}
          >
            {GUIDE_AVAILABILITIES.map((s) => (
              <option key={s} value={s}>
                {GUIDE_AVAILABILITY_LABELS[s]}
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
        onCancel={() => router.push("/en/dashboard/guides")}
      />
    </div>
  );
}
