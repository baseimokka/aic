"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, FormCard } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { createBlogCategory, updateBlogCategory } from "@/app/[locale]/(admin)/dashboard/blog/categories/actions";

export interface BlogCategoryFormValues {
  name: string;
  slug: string;
}

const LIST = "/en/dashboard/blog/categories";

export function BlogCategoryForm({ mode, id, initial }: { mode: "create" | "edit"; id?: string; initial: BlogCategoryFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = { name: v.name, slug: v.slug || undefined };
      const res = mode === "create" ? await createBlogCategory(payload) : await updateBlogCategory(id!, payload);
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
    <div className="mx-auto max-w-lg space-y-5">
      <FormCard>
        <Field label="Name" htmlFor="bc-name" required>
          <TextInput id="bc-name" value={v.name} onChange={(e) => { setV((p) => ({ ...p, name: e.target.value })); setSaved(false); }} placeholder="Travel Guides" />
        </Field>
        <Field label="Slug" htmlFor="bc-slug" hint="Leave blank to generate from the name.">
          <TextInput id="bc-slug" value={v.slug} onChange={(e) => { setV((p) => ({ ...p, slug: e.target.value })); setSaved(false); }} placeholder="travel-guides" />
        </Field>
      </FormCard>
      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
