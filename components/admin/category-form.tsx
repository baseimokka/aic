"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, FormCard } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { createCategory, updateCategory } from "@/app/[locale]/(admin)/dashboard/categories/actions";

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  order: number;
}

export function CategoryForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: CategoryFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof CategoryFormValues>(key: K, val: CategoryFormValues[K]) {
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
        order: v.order,
      };
      const res = mode === "create" ? await createCategory(payload) : await updateCategory(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create") router.push("/en/dashboard/categories");
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <FormCard>
        <Field label="Name" htmlFor="cat-name" required>
          <TextInput id="cat-name" value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Nile Cruises" />
        </Field>
        <Field label="Slug" htmlFor="cat-slug" hint="Leave blank to generate from the name.">
          <TextInput id="cat-slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="nile-cruises" />
        </Field>
        <Field label="Description" htmlFor="cat-desc" hint="Optional short description shown on the catalog.">
          <TextArea id="cat-desc" value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </Field>
        <Field label="Sort order" htmlFor="cat-order" hint="Lower numbers appear first." className="max-w-[160px]">
          <TextInput
            id="cat-order"
            type="number"
            min={0}
            value={v.order}
            onChange={(e) => set("order", Number(e.target.value) || 0)}
          />
        </Field>
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push("/en/dashboard/categories")} />
    </div>
  );
}
