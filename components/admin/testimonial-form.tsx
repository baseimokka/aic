"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, SelectField, FormCard } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { ImageField } from "@/components/admin/image-field";
import { createTestimonial, updateTestimonial } from "@/app/[locale]/(admin)/dashboard/testimonials/actions";

export interface TestimonialFormValues {
  authorName: string;
  authorCountry: string;
  quote: string;
  avatarPath: string | null;
  rating: number | null;
  order: number;
  featured: boolean;
}

const LIST = "/en/dashboard/testimonials";

export function TestimonialForm({
  mode,
  id,
  initial,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: TestimonialFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof TestimonialFormValues>(key: K, val: TestimonialFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        authorName: v.authorName,
        authorCountry: v.authorCountry,
        quote: v.quote,
        avatarPath: v.avatarPath,
        rating: v.rating,
        order: v.order,
        featured: v.featured,
      };
      const res = mode === "create" ? await createTestimonial(payload) : await updateTestimonial(id!, payload);
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
      <FormCard title="Testimonial">
        <Field label="Quote" htmlFor="t-quote" required>
          <TextArea id="t-quote" value={v.quote} onChange={(e) => set("quote", e.target.value)} rows={4} placeholder="An unforgettable journey…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Author name" htmlFor="t-name" required>
            <TextInput id="t-name" value={v.authorName} onChange={(e) => set("authorName", e.target.value)} placeholder="Sofia M." />
          </Field>
          <Field label="Country" htmlFor="t-country">
            <TextInput id="t-country" value={v.authorCountry} onChange={(e) => set("authorCountry", e.target.value)} placeholder="Germany" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rating" htmlFor="t-rating">
            <SelectField id="t-rating" value={v.rating ?? ""} onChange={(e) => set("rating", e.target.value ? Number(e.target.value) : null)}>
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} star{r > 1 ? "s" : ""}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Sort order" htmlFor="t-order" hint="Lower numbers appear first.">
            <TextInput id="t-order" type="number" min={0} value={v.order} onChange={(e) => set("order", Number(e.target.value) || 0)} />
          </Field>
        </div>
        <ToggleRow
          title="Featured"
          description="Only featured testimonials appear on the homepage."
          checked={v.featured}
          onChange={(next) => set("featured", next)}
        />
      </FormCard>

      <FormCard title="Avatar" description="Optional headshot shown beside the quote.">
        <ImageField
          value={v.avatarPath}
          onChange={(path) => set("avatarPath", path)}
          folder="gallery"
          label="Avatar"
          aspect="aspect-square"
        />
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
