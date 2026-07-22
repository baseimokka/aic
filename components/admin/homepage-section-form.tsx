"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, FormCard } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { updateHomepageSection } from "@/app/[locale]/(admin)/dashboard/homepage/actions";

export interface HomepageSectionFormValues {
  heading: string;
  body: string;
  ctaLabel: string;
  enabled: boolean;
}

const LIST = "/en/dashboard/homepage";

export function HomepageSectionForm({ id, initial }: { id: string; initial: HomepageSectionFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof HomepageSectionFormValues>(key: K, val: HomepageSectionFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateHomepageSection(id, {
        heading: v.heading,
        body: v.body,
        ctaLabel: v.ctaLabel,
        enabled: v.enabled,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard title="Copy" description="English text shown in this homepage section.">
        <Field label="Heading" htmlFor="s-heading">
          <TextInput id="s-heading" value={v.heading} onChange={(e) => set("heading", e.target.value)} />
        </Field>
        <Field label="Body" htmlFor="s-body">
          <TextArea id="s-body" value={v.body} onChange={(e) => set("body", e.target.value)} rows={3} />
        </Field>
        <Field label="Button label" htmlFor="s-cta" hint="Leave blank if this section has no button.">
          <TextInput id="s-cta" value={v.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} />
        </Field>
      </FormCard>

      <FormCard title="Display">
        <ToggleRow title="Visible" description="Show this section on the homepage." checked={v.enabled} onChange={(next) => set("enabled", next)} />
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
