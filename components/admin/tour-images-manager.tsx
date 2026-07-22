"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mediaUrl } from "@/lib/storage/url";
import type { MediaItem } from "@/lib/storage/media-item";
import { MediaPicker } from "@/components/admin/media-picker";
import { IconClose, IconGrip, IconImage, IconPlus } from "@/components/admin/icons";
import { addTourImages, removeTourImage, reorderTourImages } from "@/app/[locale]/(admin)/dashboard/tours/actions";

/**
 * Tour gallery (§ Media Storage). Images come from the shared Media Library —
 * pick several existing assets at once or upload new ones inside the picker.
 * The tour stores each asset's path (plus a copy of its alt text), so the
 * library record stays the single source of truth and no file is duplicated.
 */
export interface TourImageItem {
  id: string;
  path: string;
  alt: string;
}

export function TourImagesManager({
  tourId,
  images,
}: {
  tourId: string;
  images: TourImageItem[];
}) {
  const router = useRouter();
  const [picker, setPicker] = useState<null | "library" | "upload">(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addSelected(items: MediaItem[]) {
    setError(null);
    setNote(null);
    // The same asset may legitimately appear in many tours, but twice in one
    // gallery is always a mistake — skip those and say so.
    const existing = new Set(images.map((i) => i.path));
    const fresh = items.filter((item) => !existing.has(item.path));
    const skipped = items.length - fresh.length;
    if (fresh.length === 0) {
      setError(
        items.length === 1
          ? "That image is already in this gallery."
          : "Those images are already in this gallery.",
      );
      return;
    }
    // Announce skipped duplicates here, before the transition: the gallery
    // re-render that the server action triggers supersedes any state set inside
    // it, and the skip decision is already final. Images that *were* added need
    // no message — they appear in the list above.
    if (skipped > 0) {
      setNote(
        `${skipped} of the selected image${skipped === 1 ? " is" : "s are"} already in this gallery and ${
          skipped === 1 ? "was" : "were"
        } skipped.`,
      );
    }

    startTransition(async () => {
      // One call for the whole selection: alt text travels with each asset from
      // the library, so the gallery is never left with an unlabelled image.
      const res = await addTourImages(
        tourId,
        fresh.map((item) => ({ path: item.path, alt: item.alt })),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[index], ids[next]] = [ids[next], ids[index]];
    startTransition(async () => {
      const res = await reorderTourImages(tourId, ids);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await removeTourImage(id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {images.length > 0 ? (
        <ul className="space-y-2">
          {images.map((img, i) => (
            <li key={img.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
              <span className="text-faint">
                <IconGrip />
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(img.path) ?? ""}
                alt=""
                loading="lazy"
                className="h-14 w-20 flex-shrink-0 rounded-lg bg-surface-2 object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{img.alt}</span>
                <span className="block truncate font-mono text-[11px] text-faint">{img.path}</span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-input text-ink-soft hover:bg-cream disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending || i === images.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-input text-ink-soft hover:bg-cream disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(img.id)}
                  aria-label={`Remove ${img.alt}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3c9c4] text-danger hover:bg-danger-soft disabled:opacity-40"
                >
                  <IconClose width={15} height={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No images yet. Add the first one below.</p>
      )}

      <div className="space-y-3 rounded-xl border-[1.5px] border-dashed border-line-input bg-cream p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setPicker("library")}
            className="inline-flex h-11 items-center gap-1.5 rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            <IconImage width={15} height={15} />
            Choose from Media
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setPicker("upload")}
            className="inline-flex h-11 items-center gap-1.5 rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink hover:bg-white/60 disabled:opacity-60"
          >
            <IconPlus width={15} height={15} />
            Upload new
          </button>
        </div>
        <p className="text-[11px] text-faint">
          {pending ? "Saving…" : "Select several at once — the first image in the list is the tour's cover."}
        </p>
        <p className="min-h-[14px] text-[11px] font-semibold" role="status" aria-live="polite">
          {error ? <span className="text-danger">{error}</span> : note ? <span className="text-accent">{note}</span> : null}
        </p>
      </div>

      <MediaPicker
        open={picker !== null}
        initialTab={picker ?? "library"}
        onClose={() => setPicker(null)}
        onSelect={addSelected}
        folder="tours"
        multiple
        title="Tour gallery images"
      />
    </div>
  );
}
