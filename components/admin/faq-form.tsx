"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, TextInput, TextArea, FormCard } from "@/components/admin/form";
import { SaveBar } from "@/components/admin/controls";
import { createFaq, updateFaq } from "@/app/[locale]/(admin)/dashboard/faq/actions";

export interface FaqFormValues {
  question: string;
  answer: string;
  order: number;
}

const LIST = "/en/dashboard/faq";

export function FaqForm({ mode, id, initial }: { mode: "create" | "edit"; id?: string; initial: FaqFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FaqFormValues>(key: K, val: FaqFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const payload = { question: v.question, answer: v.answer, order: v.order, tourId: null };
      const res = mode === "create" ? await createFaq(payload) : await updateFaq(id!, payload);
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
      <FormCard>
        <Field label="Question" htmlFor="f-q" required>
          <TextInput id="f-q" value={v.question} onChange={(e) => set("question", e.target.value)} placeholder="Do I need a visa for Egypt?" />
        </Field>
        <Field label="Answer" htmlFor="f-a" required>
          <TextArea id="f-a" value={v.answer} onChange={(e) => set("answer", e.target.value)} rows={5} />
        </Field>
        <Field label="Sort order" htmlFor="f-order" hint="Lower numbers appear first." className="max-w-[160px]">
          <TextInput id="f-order" type="number" min={0} value={v.order} onChange={(e) => set("order", Number(e.target.value) || 0)} />
        </Field>
      </FormCard>

      <SaveBar pending={pending} saved={saved} error={error} onSave={submit} onCancel={() => router.push(LIST)} />
    </div>
  );
}
