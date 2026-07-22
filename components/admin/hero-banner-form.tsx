"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { ImageField } from "@/components/admin/image-field";
import { createHeroBanner, updateHeroBanner } from "@/app/[locale]/(admin)/dashboard/hero-banners/actions";

export interface HeroBannerFormValues {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaUrl: string;
  imagePath: string | null;
  order: number;
  enabled: boolean;
  showSearch: boolean;
  startsAt: string;
  endsAt: string;
}

const LIST = "/en/dashboard/hero-banners";

export function HeroBannerForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: HeroBannerFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof HeroBannerFormValues>(key: K, val: HeroBannerFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        headline: v.headline,
        subheadline: v.subheadline,
        ctaLabel: v.ctaLabel,
        ctaUrl: v.ctaUrl,
        imagePath: v.imagePath ?? "",
        order: v.order,
        enabled: v.enabled,
        showSearch: v.showSearch,
        startsAt: v.startsAt,
        endsAt: v.endsAt,
      };
      const res = mode === "create" ? await createHeroBanner(payload) : await updateHeroBanner(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push(LIST);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard title="Image" description="Required — the full-bleed background of the slide.">
        <ImageField
          value={v.imagePath}
          onChange={(path) => set("imagePath", path)}
          folder="hero"
          label="Banner image"
          aspect="aspect-[21/9]"
        />
      </FormCard>

      <FormCard title="Copy">
        <Field label="Headline" htmlFor="h-headline" required>
          <TextInput id="h-headline" value={v.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Discover Ancient Egypt" />
        </Field>
        <Field label="Subheadline" htmlFor="h-sub">
          <TextArea id="h-sub" value={v.subheadline} onChange={(e) => set("subheadline", e.target.value)} rows={2} />
        </Field>
        <FormGrid>
          <Field label="Button label" htmlFor="h-cta">
            <TextInput id="h-cta" value={v.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Explore tours" />
          </Field>
          <Field label="Button URL" htmlFor="h-ctaurl">
            <TextInput id="h-ctaurl" value={v.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/en/tours" />
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard title="Display & schedule">
        <ToggleRow title="Enabled" description="Only enabled banners appear in the hero carousel." checked={v.enabled} onChange={(next) => set("enabled", next)} />
        <ToggleRow title="Show search bar" description="Show the destination / tour search box on this slide." checked={v.showSearch} onChange={(next) => set("showSearch", next)} />
        <FormGrid>
          <Field label="Sort order" htmlFor="h-order" hint="Lower numbers appear first.">
            <TextInput id="h-order" type="number" min={0} value={v.order} onChange={(e) => set("order", Number(e.target.value) || 0)} />
          </Field>
          <div />
          <Field label="Starts at" htmlFor="h-starts" hint="Optional — show from this date.">
            <TextInput id="h-starts" type="date" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label="Ends at" htmlFor="h-ends" hint="Optional — hide after this date.">
            <TextInput id="h-ends" type="date" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
        </FormGrid>
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
