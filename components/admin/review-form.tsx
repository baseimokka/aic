"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReviewSource } from "@prisma/client";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { REVIEW_SOURCES, REVIEW_SOURCE_LABELS, REVIEW_RATINGS } from "@/lib/reviews/labels";
import { Field, TextInput, TextArea, SelectField, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { createReview, updateReview } from "@/app/[locale]/(admin)/dashboard/reviews/actions";

export interface ReviewFormValues {
  customerName: string;
  customerCountry: string;
  tourId: string; // "" = general review (no tour)
  rating: number;
  body: string;
  travelDate: string; // "YYYY-MM-DD" or ""
  language: Locale;
  source: ReviewSource;
  featured: boolean;
  visible: boolean;
  displayOrder: number;
}

/** Tour options for the optional relation — English titles (admin chrome, §3). */
export interface ReviewTourOption {
  id: string;
  title: string;
}

const LIST = "/en/dashboard/reviews";

export function ReviewForm({
  mode,
  id,
  initial,
  tours,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: ReviewFormValues;
  tours: ReviewTourOption[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ReviewFormValues>(key: K, val: ReviewFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        customerName: v.customerName,
        customerCountry: v.customerCountry,
        tourId: v.tourId || null,
        rating: v.rating,
        body: v.body,
        travelDate: v.travelDate,
        language: v.language,
        source: v.source,
        featured: v.featured,
        visible: v.visible,
        displayOrder: v.displayOrder,
      };
      const res = mode === "create" ? await createReview(payload) : await updateReview(id!, payload);
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
      <FormCard title="Review">
        <Field
          label="Review text"
          htmlFor="r-body"
          required
          hint="Kept exactly as the customer wrote it — never translated."
        >
          <TextArea id="r-body" value={v.body} onChange={(e) => set("body", e.target.value)} rows={5} placeholder="An unforgettable journey…" />
        </Field>
        <FormGrid>
          <Field label="Customer name" htmlFor="r-name" required>
            <TextInput id="r-name" value={v.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Sofia M." />
          </Field>
          <Field label="Country" htmlFor="r-country">
            <TextInput id="r-country" value={v.customerCountry} onChange={(e) => set("customerCountry", e.target.value)} placeholder="Germany" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Rating" htmlFor="r-rating" required>
            <SelectField id="r-rating" value={v.rating} onChange={(e) => set("rating", Number(e.target.value))}>
              {REVIEW_RATINGS.map((r) => (
                <option key={r} value={r}>
                  {"★".repeat(r)} — {r} of 5
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Travel date" htmlFor="r-travel" hint="When the customer travelled (optional).">
            <TextInput
              id="r-travel"
              type="date"
              value={v.travelDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => set("travelDate", e.target.value)}
            />
          </Field>
        </FormGrid>
        <Field label="Tour" htmlFor="r-tour" hint="Leave empty for a general review not tied to one tour.">
          <SelectField id="r-tour" value={v.tourId} onChange={(e) => set("tourId", e.target.value)}>
            <option value="">No specific tour</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </SelectField>
        </Field>
        <FormGrid>
          <Field label="Language" htmlFor="r-language" hint="The language the review was written in.">
            <SelectField id="r-language" value={v.language} onChange={(e) => set("language", e.target.value as Locale)}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l].english}
                </option>
              ))}
            </SelectField>
          </Field>
          <Field label="Source" htmlFor="r-source" hint="Where the review was received.">
            <SelectField id="r-source" value={v.source} onChange={(e) => set("source", e.target.value as ReviewSource)}>
              {REVIEW_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {REVIEW_SOURCE_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </Field>
        </FormGrid>
      </FormCard>

      <FormCard title="Display">
        <ToggleRow
          title="Visible"
          description="Shown on the public site (tour page and rating summaries)."
          checked={v.visible}
          onChange={(next) => set("visible", next)}
        />
        <ToggleRow
          title="Featured"
          description="Featured reviews appear first on the tour page."
          checked={v.featured}
          onChange={(next) => set("featured", next)}
        />
        <Field label="Sort order" htmlFor="r-order" hint="Lower numbers appear first." className="max-w-[180px]">
          <TextInput id="r-order" type="number" min={0} value={v.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value) || 0)} />
        </Field>
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
