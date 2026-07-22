"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CancellationPolicy, PickupType } from "@prisma/client";
import { cn, formatMoney } from "@/lib/utils";
import { resolvePricing } from "@/lib/pricing";
import {
  PICKUP_TYPES,
  PICKUP_TYPE_LABELS,
  CANCELLATION_POLICIES,
  CANCELLATION_POLICY_LABELS,
  TOUR_GUIDE_LANGUAGE_CODES,
  isTourGuideLanguage,
} from "@/lib/tours/labels";
import { languageNames } from "@/lib/i18n/languages";
import { Field, TextInput, TextArea, SelectField, FormCard, FormGrid, labelClass, hintClass } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { TagInput } from "@/components/admin/tag-input";
import { ImageField } from "@/components/admin/image-field";
import { TourImagesManager, type TourImageItem } from "@/components/admin/tour-images-manager";
import { TourFaqManager, type TourFaqItem } from "@/components/admin/tour-faq-manager";
import { createTour, updateTour } from "@/app/[locale]/(admin)/dashboard/tours/actions";

export interface TourCoreValues {
  title: string;
  slug: string;
  categoryId: string;
  destinationId: string;
  tourType: string;
  durationDays: number;
  basePrice: number;
  /** ISO 4217 code; the offered set comes from Settings.currencies. */
  currency: string;
  discountType: "" | "FIXED" | "PERCENT";
  discountValue: number | null;
  discountStartsAt: string;
  discountEndsAt: string;
  pickupType: "" | PickupType;
  cancellationPolicy: "" | CancellationPolicy;
  customFacts: string[];
  guideLanguages: string[];
  familyFriendly: boolean;
  coupleFriendly: boolean;
  soloFriendly: boolean;
  featured: boolean;
  popularityScore: number;
  status: "ACTIVE" | "DISABLED";
  overview: string;
  itinerary: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  seoTitle: string;
  metaDescription: string;
  ogImagePath: string | null;
}

type Tab = "basics" | "content" | "images" | "faq" | "seo";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "basics", label: "Basics" },
  { key: "content", label: "Content" },
  { key: "images", label: "Images" },
  { key: "faq", label: "FAQ" },
  { key: "seo", label: "SEO" },
];

const LIST = "/en/dashboard/tours";

// Admin chrome is English-only; the public site localizes these per locale.
const GUIDE_LANGUAGE_NAMES = languageNames(TOUR_GUIDE_LANGUAGE_CODES, "en");

export function TourEditor({
  mode,
  id,
  initial,
  categories,
  destinations,
  currencies,
  images = [],
  faqs = [],
}: {
  mode: "create" | "edit";
  id?: string;
  initial: TourCoreValues;
  categories: Array<{ id: string; name: string }>;
  destinations: Array<{ id: string; name: string }>;
  /** Currency codes offered in Settings (always includes the tour's current one). */
  currencies: string[];
  images?: TourImageItem[];
  faqs?: TourFaqItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basics");
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof TourCoreValues>(key: K, val: TourCoreValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  // Keep the stored order canonical so the public "•"-separated list is stable.
  function toggleLanguage(code: string) {
    const next = v.guideLanguages.includes(code)
      ? v.guideLanguages.filter((c) => c !== code)
      : [...v.guideLanguages, code];
    set(
      "guideLanguages",
      next.sort(
        (a, b) =>
          (TOUR_GUIDE_LANGUAGE_CODES as readonly string[]).indexOf(a) -
          (TOUR_GUIDE_LANGUAGE_CODES as readonly string[]).indexOf(b),
      ),
    );
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        title: v.title,
        slug: v.slug || undefined,
        categoryId: v.categoryId || null,
        destinationId: v.destinationId || null,
        tourType: v.tourType,
        durationDays: v.durationDays,
        basePrice: v.basePrice,
        currency: v.currency,
        discountType: v.discountType || null,
        discountValue: v.discountType ? v.discountValue : null,
        discountStartsAt: v.discountType ? v.discountStartsAt : "",
        discountEndsAt: v.discountType ? v.discountEndsAt : "",
        pickupType: v.pickupType || null,
        cancellationPolicy: v.cancellationPolicy || null,
        customFacts: v.customFacts,
        guideLanguages: v.guideLanguages.filter(isTourGuideLanguage),
        familyFriendly: v.familyFriendly,
        coupleFriendly: v.coupleFriendly,
        soloFriendly: v.soloFriendly,
        featured: v.featured,
        popularityScore: v.popularityScore,
        status: v.status,
        overview: v.overview,
        itinerary: v.itinerary,
        highlights: v.highlights,
        included: v.included,
        excluded: v.excluded,
        seoTitle: v.seoTitle,
        metaDescription: v.metaDescription,
        ogImagePath: v.ogImagePath,
      };
      const res = mode === "create" ? await createTour(payload) : await updateTour(id!, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (mode === "create" && res.id) router.push(`/en/dashboard/tours/${res.id}`);
      else router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap gap-1 border-b border-line" role="tablist" aria-label="Tour editor sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-11 rounded-t-lg px-4 py-2 text-[13px] font-bold",
              tab === t.key ? "border-b-2 border-accent text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "basics" ? (
        <div className="space-y-5">
          <FormCard title="Basics">
            <Field label="Title" htmlFor="t-title" required>
              <TextInput id="t-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Nile Cruise: Luxor to Aswan" />
            </Field>
            <Field label="Slug" htmlFor="t-slug" hint="Leave blank to generate from the title.">
              <TextInput id="t-slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} />
            </Field>
            <FormGrid>
              <Field label="Category" htmlFor="t-cat">
                <SelectField id="t-cat" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
              </Field>
              <Field label="Destination" htmlFor="t-dest">
                <SelectField id="t-dest" value={v.destinationId} onChange={(e) => set("destinationId", e.target.value)}>
                  <option value="">No destination</option>
                  {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
              </Field>
              <Field label="Tour type" htmlFor="t-type" required>
                <TextInput id="t-type" value={v.tourType} onChange={(e) => set("tourType", e.target.value)} placeholder="Cruise" />
              </Field>
              <Field label="Duration (days)" htmlFor="t-days" required>
                <TextInput id="t-days" type="number" min={1} value={v.durationDays} onChange={(e) => set("durationDays", Number(e.target.value) || 1)} />
              </Field>
              <Field label="Base price" htmlFor="t-price" required>
                <TextInput id="t-price" type="number" min={0} step="0.01" value={v.basePrice} onChange={(e) => set("basePrice", Number(e.target.value) || 0)} />
              </Field>
              <Field label="Currency" htmlFor="t-cur">
                <SelectField id="t-cur" value={v.currency} onChange={(e) => set("currency", e.target.value)}>
                  {(currencies.includes(v.currency) ? currencies : [v.currency, ...currencies]).map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </SelectField>
              </Field>
            </FormGrid>
          </FormCard>

          <FormCard title="Discount" description="Optional promotional pricing shown struck-through against the base price on the public site.">
            <FormGrid>
              <Field label="Discount" htmlFor="t-disc-type">
                <SelectField
                  id="t-disc-type"
                  value={v.discountType}
                  onChange={(e) => set("discountType", e.target.value as TourCoreValues["discountType"])}
                >
                  <option value="">No discount</option>
                  <option value="FIXED">Discounted price</option>
                  <option value="PERCENT">Percent off</option>
                </SelectField>
              </Field>
              {v.discountType ? (
                <Field
                  label={v.discountType === "FIXED" ? "Discounted price" : "Percent off"}
                  htmlFor="t-disc-value"
                  required
                  hint={v.discountType === "FIXED" ? "Must be lower than the base price." : "1–99."}
                >
                  <TextInput
                    id="t-disc-value"
                    type="number"
                    min={v.discountType === "PERCENT" ? 1 : 0.01}
                    max={v.discountType === "PERCENT" ? 99 : undefined}
                    step={v.discountType === "PERCENT" ? 1 : "0.01"}
                    value={v.discountValue ?? ""}
                    onChange={(e) => set("discountValue", e.target.value === "" ? null : Number(e.target.value))}
                  />
                </Field>
              ) : null}
            </FormGrid>
            {v.discountType ? (
              <>
                <FormGrid>
                  <Field label="Starts" htmlFor="t-disc-start" hint="Optional — the discount activates on this date.">
                    <TextInput id="t-disc-start" type="date" value={v.discountStartsAt} onChange={(e) => set("discountStartsAt", e.target.value)} />
                  </Field>
                  <Field label="Ends" htmlFor="t-disc-end" hint="Optional — the discount stops on this date.">
                    <TextInput id="t-disc-end" type="date" value={v.discountEndsAt} onChange={(e) => set("discountEndsAt", e.target.value)} />
                  </Field>
                </FormGrid>
                <DiscountPreview basePrice={v.basePrice} currency={v.currency} type={v.discountType} value={v.discountValue} />
              </>
            ) : null}
          </FormCard>

          <FormCard
            title="Traveler essentials"
            description="Shown as Quick Facts on the tour page. Anything left unset is simply hidden."
          >
            <FormGrid>
              <Field label="Pickup" htmlFor="t-pickup">
                <SelectField id="t-pickup" value={v.pickupType} onChange={(e) => set("pickupType", e.target.value as TourCoreValues["pickupType"])}>
                  <option value="">Not specified</option>
                  {PICKUP_TYPES.map((p) => (
                    <option key={p} value={p}>{PICKUP_TYPE_LABELS[p]}</option>
                  ))}
                </SelectField>
              </Field>
              <Field label="Cancellation policy" htmlFor="t-cancel">
                <SelectField id="t-cancel" value={v.cancellationPolicy} onChange={(e) => set("cancellationPolicy", e.target.value as TourCoreValues["cancellationPolicy"])}>
                  <option value="">Not specified</option>
                  {CANCELLATION_POLICIES.map((c) => (
                    <option key={c} value={c}>{CANCELLATION_POLICY_LABELS[c]}</option>
                  ))}
                </SelectField>
              </Field>
            </FormGrid>
            <fieldset>
              <legend className={labelClass}>Guide languages</legend>
              <div className="flex flex-wrap gap-2">
                {TOUR_GUIDE_LANGUAGE_CODES.map((code, i) => {
                  const checked = v.guideLanguages.includes(code);
                  return (
                    <label
                      key={code}
                      className={cn(
                        "cursor-pointer select-none rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-bold transition-colors",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                        checked ? "border-accent bg-accent-soft text-accent-deep" : "border-line-input bg-white text-muted hover:text-ink",
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleLanguage(code)} />
                      {GUIDE_LANGUAGE_NAMES[i]}
                    </label>
                  );
                })}
              </div>
              <p className={hintClass}>Languages guides can lead this tour in — shown to travelers in their own language.</p>
            </fieldset>
            <Field
              label="Custom facts (manual write)"
              hint={'Free-written facts shown alongside the structured ones. Press Enter to add each. Optional "Label :: Value" format — e.g. "Group size :: Max 8 guests". Translated per locale in the translation editor.'}
            >
              <TagInput
                value={v.customFacts}
                onChange={(next) => set("customFacts", next)}
                ariaLabel="Custom fact entries"
                placeholder="Group size :: Max 8 guests"
              />
            </Field>
          </FormCard>

          <FormCard title="Suitability & visibility">
            <ToggleRow title="Family friendly" checked={v.familyFriendly} onChange={(n) => set("familyFriendly", n)} />
            <ToggleRow title="Couple friendly" checked={v.coupleFriendly} onChange={(n) => set("coupleFriendly", n)} />
            <ToggleRow title="Solo friendly" checked={v.soloFriendly} onChange={(n) => set("soloFriendly", n)} />
            <ToggleRow title="Featured" description="Featured tours surface on the homepage." checked={v.featured} onChange={(n) => set("featured", n)} />
            <FormGrid>
              <Field label="Status" htmlFor="t-status" hint="Hidden tours stay off the public site.">
                <SelectField id="t-status" value={v.status} onChange={(e) => set("status", e.target.value as TourCoreValues["status"])}>
                  <option value="ACTIVE">Published</option>
                  <option value="DISABLED">Hidden</option>
                </SelectField>
              </Field>
              <Field label="Popularity score" htmlFor="t-pop" hint="Higher shows earlier in ‘popular’ sorts.">
                <TextInput id="t-pop" type="number" min={0} value={v.popularityScore} onChange={(e) => set("popularityScore", Number(e.target.value) || 0)} />
              </Field>
            </FormGrid>
          </FormCard>
        </div>
      ) : null}

      {tab === "content" ? (
        <div className="space-y-5">
          <FormCard title="Content" description="English source copy. Other languages are generated later.">
            <Field label="Overview" htmlFor="t-overview" required>
              <TextArea id="t-overview" value={v.overview} onChange={(e) => set("overview", e.target.value)} rows={5} />
            </Field>
            <Field
              label="Itinerary"
              htmlFor="t-itin"
              hint="One day per line. Add optional detail after “::” — e.g. “Day 1 — Luxor temples :: Board at midday, then Karnak by dusk.”"
            >
              <TextArea id="t-itin" value={v.itinerary} onChange={(e) => set("itinerary", e.target.value)} rows={8} />
            </Field>
          </FormCard>
          <FormCard title="Highlights" description="Short selling points shown right after the overview.">
            <Field label="Highlights" hint="Press Enter or comma to add each item.">
              <TagInput value={v.highlights} onChange={(next) => set("highlights", next)} ariaLabel="Highlight items" placeholder="Valley of the Kings with a private guide" />
            </Field>
          </FormCard>
          <FormCard title="What's included / excluded">
            <Field label="Included" hint="Press Enter or comma to add each item.">
              <TagInput value={v.included} onChange={(next) => set("included", next)} ariaLabel="Included items" placeholder="Full-board meals" />
            </Field>
            <Field label="Excluded" hint="Press Enter or comma to add each item.">
              <TagInput value={v.excluded} onChange={(next) => set("excluded", next)} ariaLabel="Excluded items" placeholder="International flights" />
            </Field>
          </FormCard>
        </div>
      ) : null}

      {tab === "images" ? (
        <FormCard title="Gallery" description="The first image is the tour's cover.">
          {mode === "edit" && id ? (
            <TourImagesManager tourId={id} images={images} />
          ) : (
            <p className="text-sm text-muted">Save the tour first, then add gallery images here.</p>
          )}
        </FormCard>
      ) : null}

      {tab === "faq" ? (
        <FormCard title="Tour FAQ" description="Questions specific to this tour.">
          {mode === "edit" && id ? (
            <TourFaqManager tourId={id} faqs={faqs} />
          ) : (
            <p className="text-sm text-muted">Save the tour first, then add FAQs here.</p>
          )}
        </FormCard>
      ) : null}

      {tab === "seo" ? (
        <div className="space-y-5">
          <FormCard title="SEO" description="English metadata for search and social sharing.">
            <Field label="SEO title" htmlFor="t-seo-title">
              <TextInput id="t-seo-title" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </Field>
            <Field label="Meta description" htmlFor="t-seo-desc" hint="Around 150–160 characters.">
              <TextArea id="t-seo-desc" value={v.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} rows={2} />
            </Field>
          </FormCard>
          <FormCard title="Social image" description="Open Graph image used when the tour is shared.">
            <ImageField
              value={v.ogImagePath}
              onChange={(path) => set("ogImagePath", path)}
              folder="tours"
              label="OG image"
              aspect="aspect-[1200/630]"
            />
          </FormCard>
        </div>
      ) : null}

      <div className="mt-6">
        <SaveBar
          pending={pending}
          saved={saved}
          error={error}
          onSave={submit}
          onCancel={() => router.push(LIST)}
          saveLabel={mode === "create" ? "Create tour" : "Save tour"}
        />
        {mode === "create" ? (
          <p className="mt-2 text-[12px] text-faint">Images and FAQs can be added after the tour is created.</p>
        ) : null}
      </div>
    </div>
  );
}

/** Live "what customers pay" line, driven by the same resolver the site uses. */
function DiscountPreview({
  basePrice,
  currency,
  type,
  value,
}: {
  basePrice: number;
  currency: string;
  type: "FIXED" | "PERCENT";
  value: number | null;
}) {
  // Dates omitted on purpose: the preview shows the discount as if active now.
  const pricing = resolvePricing({
    basePrice,
    discountType: type,
    discountValue: value,
    discountStartsAt: null,
    discountEndsAt: null,
  });
  if (value == null) return null;
  if (pricing.discountPercent == null) {
    return (
      <p className="text-[13px] font-medium text-danger">
        This discount doesn&apos;t lower the price, so it will be ignored on the site.
      </p>
    );
  }
  return (
    <p className="text-[13px] text-muted">
      Customers pay{" "}
      <strong className="text-ink tabular-nums">{formatMoney(pricing.effectivePrice, currency)}</strong> per person (
      {pricing.discountPercent}% off <s className="tabular-nums">{formatMoney(basePrice, currency)}</s>).
    </p>
  );
}
