"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, SelectField, FormCard, FormGrid } from "@/components/admin/form";
import { SaveBar, ToggleRow } from "@/components/admin/controls";
import { ImageField } from "@/components/admin/image-field";
import { createBlogPost, updateBlogPost } from "@/app/[locale]/(admin)/dashboard/blog/actions";

export interface BlogPostFormValues {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  body: string;
  coverImagePath: string | null;
  featured: boolean;
  published: boolean;
  seoTitle: string;
  metaDescription: string;
}

const LIST = "/en/dashboard/blog";

export function BlogPostForm({
  mode,
  id,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  id?: string;
  initial: BlogPostFormValues;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof BlogPostFormValues>(key: K, val: BlogPostFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = {
        title: v.title,
        slug: v.slug || undefined,
        categoryId: v.categoryId || null,
        excerpt: v.excerpt,
        body: v.body,
        coverImagePath: v.coverImagePath,
        featured: v.featured,
        published: v.published,
        seoTitle: v.seoTitle,
        metaDescription: v.metaDescription,
      };
      const res = mode === "create" ? await createBlogPost(payload) : await updateBlogPost(id!, payload);
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
      <FormCard title="Article">
        <Field label="Title" htmlFor="b-title" required>
          <TextInput id="b-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="The Complete Nile Cruise Guide" />
        </Field>
        <FormGrid>
          <Field label="Slug" htmlFor="b-slug" hint="Leave blank to generate from the title.">
            <TextInput id="b-slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="nile-cruise-guide" />
          </Field>
          <Field label="Category" htmlFor="b-cat">
            <SelectField id="b-cat" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          </Field>
        </FormGrid>
        <Field label="Excerpt" htmlFor="b-excerpt" hint="Short summary shown on cards and in previews.">
          <TextArea id="b-excerpt" value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} />
        </Field>
        <Field label="Body" htmlFor="b-body" hint="Plain text. Separate paragraphs with a blank line." required>
          <TextArea id="b-body" value={v.body} onChange={(e) => set("body", e.target.value)} rows={12} />
        </Field>
      </FormCard>

      <FormCard title="Cover image">
        <ImageField
          value={v.coverImagePath}
          onChange={(path) => set("coverImagePath", path)}
          folder="blog"
          label="Cover image"
          aspect="aspect-[16/9]"
        />
      </FormCard>

      <FormCard title="Publishing">
        <ToggleRow title="Published" description="Draft posts are hidden from the public blog." checked={v.published} onChange={(next) => set("published", next)} />
        <ToggleRow title="Featured" description="Featured posts are highlighted on the blog index." checked={v.featured} onChange={(next) => set("featured", next)} />
      </FormCard>

      <FormCard title="SEO">
        <Field label="SEO title" htmlFor="b-seo-title">
          <TextInput id="b-seo-title" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </Field>
        <Field label="Meta description" htmlFor="b-seo-desc" hint="Around 150–160 characters.">
          <TextArea id="b-seo-desc" value={v.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} rows={2} />
        </Field>
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
