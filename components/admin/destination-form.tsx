"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, FormCard } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { ImageField } from "@/components/admin/image-field";
import { createDestination, updateDestination } from "@/app/[locale]/(admin)/dashboard/destinations/actions";

export interface DestinationFormValues {
  name: string;
  slug: string;
  description: string;
  heroImagePath: string | null;
  order: number;
  featured: boolean;
  seoTitle: string;
  metaDescription: string;
}

const LIST = "/en/dashboard/destinations";

export function DestinationForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: DestinationFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof DestinationFormValues>(key: K, val: DestinationFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        name: v.name,
        slug: v.slug || undefined,
        description: v.description,
        heroImagePath: v.heroImagePath,
        order: v.order,
        featured: v.featured,
        seoTitle: v.seoTitle,
        metaDescription: v.metaDescription,
      };
      const res = mode === "create" ? await createDestination(payload) : await updateDestination(id!, payload);
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
      <FormCard title="Details">
        <Field label="Name" htmlFor="d-name" required>
          <TextInput id="d-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Luxor" />
        </Field>
        <Field label="Slug" htmlFor="d-slug" hint="Leave blank to generate from the name.">
          <TextInput id="d-slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="luxor" />
        </Field>
        <Field label="Description" htmlFor="d-desc">
          <TextArea id="d-desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={4} />
        </Field>
        <Field label="Sort order" htmlFor="d-order" hint="Lower numbers appear first." className="max-w-[160px]">
          <TextInput id="d-order" type="number" min={0} value={v.order} onChange={(e) => set("order", Number(e.target.value) || 0)} />
        </Field>
        <ToggleRow
          title="Featured"
          description="Show this destination in the featured strip on the homepage."
          checked={v.featured}
          onChange={(next) => set("featured", next)}
        />
      </FormCard>

      <FormCard title="Hero image">
        <ImageField
          value={v.heroImagePath}
          onChange={(path) => set("heroImagePath", path)}
          folder="destinations"
          label="Hero image"
          aspect="aspect-[21/9]"
        />
      </FormCard>

      <FormCard title="SEO" description="English metadata for search engines and social sharing.">
        <Field label="SEO title" htmlFor="d-seo-title">
          <TextInput id="d-seo-title" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </Field>
        <Field label="Meta description" htmlFor="d-seo-desc" hint="Around 150–160 characters.">
          <TextArea id="d-seo-desc" value={v.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} rows={2} />
        </Field>
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
