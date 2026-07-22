"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { controlClass, textareaClass, labelClass } from "@/components/admin/form";
import { IconClose } from "@/components/admin/icons";
import { addTourFaq, updateTourFaq, removeTourFaq, reorderTourFaqs } from "@/app/[locale]/(admin)/dashboard/tours/actions";

export interface TourFaqItem {
  id: string;
  question: string;
  answer: string;
}

export function TourFaqManager({ tourId, faqs }: { tourId: string; faqs: TourFaqItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean } | { ok: false; error: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError((res as { error: string }).error);
      else {
        onOk?.();
        router.refresh();
      }
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= faqs.length) return;
    const ids = faqs.map((f) => f.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    run(() => reorderTourFaqs(tourId, ids));
  }

  return (
    <div className="space-y-5">
      {faqs.length > 0 ? (
        <ul className="space-y-2">
          {faqs.map((f, i) => (
            <li key={f.id} className="rounded-xl border border-line bg-white p-3.5">
              {editing === f.id ? (
                <div className="space-y-2">
                  <input value={editQ} onChange={(e) => setEditQ(e.target.value)} className={controlClass} />
                  <textarea value={editA} onChange={(e) => setEditA(e.target.value)} rows={3} className={textareaClass} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => updateTourFaq(f.id, { question: editQ, answer: editA }), () => setEditing(null))}
                      className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="inline-flex h-9 items-center rounded-lg border border-line-input bg-white px-4 text-xs font-bold text-ink-soft hover:bg-cream">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-ink">{f.question}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{f.answer}</span>
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-1">
                    <button type="button" disabled={pending || i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line-input text-ink-soft hover:bg-cream disabled:opacity-40">↑</button>
                    <button type="button" disabled={pending || i === faqs.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line-input text-ink-soft hover:bg-cream disabled:opacity-40">↓</button>
                    <button
                      type="button"
                      onClick={() => { setEditing(f.id); setEditQ(f.question); setEditA(f.answer); }}
                      className="inline-flex h-8 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
                    >
                      Edit
                    </button>
                    <button type="button" disabled={pending} onClick={() => run(() => removeTourFaq(f.id))} aria-label="Remove FAQ" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3c9c4] text-danger hover:bg-danger-soft disabled:opacity-40">
                      <IconClose width={14} height={14} />
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No FAQs yet for this tour.</p>
      )}

      <div className="space-y-3 rounded-xl border-[1.5px] border-dashed border-line-input bg-cream p-4">
        <span className={labelClass}>Add question</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What's included in the price?" className={controlClass} />
        <textarea value={a} onChange={(e) => setA(e.target.value)} rows={3} placeholder="Answer…" className={textareaClass} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!q.trim() || !a.trim()) return setError("Question and answer are both required.");
              run(() => addTourFaq(tourId, { question: q, answer: a }), () => { setQ(""); setA(""); });
            }}
            className="inline-flex h-10 items-center rounded-[10px] bg-ink px-5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            Add FAQ
          </button>
          {error ? <span className="text-[11px] font-semibold text-danger">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}
