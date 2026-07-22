"use client";

import { useEffect, useState } from "react";
import type { MediaFolder } from "@/lib/storage/folders";
import { mediaUrl } from "@/lib/storage/url";
import type { MediaItem, MediaListResponse } from "@/lib/storage/media-item";
import { formatBytes, formatDate } from "@/lib/utils";
import { labelClass, hintClass } from "@/components/admin/form";
import { MediaPicker } from "@/components/admin/media-picker";
import { IconClose, IconImage, IconPlus } from "@/components/admin/icons";

/**
 * Single-image field (§ Media Storage). Both routes into the library are one
 * click away — pick an existing asset or upload a new one — and both end in the
 * same place: the field stores the asset's path, so selecting an existing image
 * reuses its record and file rather than duplicating it.
 *
 * The parent still owns the value (controlled via value/onChange), so every
 * existing call site keeps working unchanged.
 */
export function ImageField({
  value,
  onChange,
  folder,
  label = "Image",
  hint,
  aspect = "aspect-[16/9]",
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  folder: MediaFolder;
  label?: string;
  hint?: string;
  aspect?: string;
}) {
  const [picker, setPicker] = useState<null | "library" | "upload">(null);
  const [meta, setMeta] = useState<MediaItem | null>(null);
  // Metadata is only shown when it belongs to the current value, so clearing or
  // replacing the image needs no extra bookkeeping.
  const info = value && meta?.path === value ? meta : null;

  // Hydrate metadata for a value loaded from the database. Assets predating the
  // library (or since archived) simply show without stats — never an error.
  useEffect(() => {
    if (!value || meta?.path === value) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/media/list?path=${encodeURIComponent(value)}`);
        if (!res.ok) return;
        const data = (await res.json()) as MediaListResponse;
        if (!cancelled) setMeta(data.items[0] ?? null);
      } catch {
        /* metadata is decorative — a failed lookup leaves the preview intact */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, meta?.path]);

  function handleSelect(items: MediaItem[]) {
    const picked = items[0];
    if (!picked) return;
    setMeta(picked);
    onChange(picked.path);
  }

  return (
    <div>
      <span className={labelClass}>{label}</span>

      {value ? (
        <div>
          <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2">
            {/* Preview via a plain img so the field stays a pure client component. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(value) ?? ""} alt={info?.alt ?? ""} className={`w-full ${aspect} object-cover`} />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(null)}
              className="absolute end-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ink/70 text-white hover:bg-ink"
            >
              <IconClose width={16} height={16} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPicker("library")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border-[1.5px] border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream"
            >
              <IconImage width={14} height={14} />
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-9 items-center rounded-lg border-[1.5px] border-line-input bg-white px-3 text-xs font-bold text-ink-soft hover:bg-cream"
            >
              Remove
            </button>
          </div>

          <p className="mt-1.5 truncate text-[11px] text-faint">
            {info ? (
              <>
                {info.alt}
                {info.width && info.height ? ` · ${info.width}×${info.height}` : ""}
                {formatBytes(info.bytes) ? ` · ${formatBytes(info.bytes)}` : ""}
                {` · ${formatDate(new Date(info.createdAt))}`}
              </>
            ) : (
              value
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border-[1.5px] border-dashed border-line-input bg-cream p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPicker("library")}
              className="inline-flex h-11 items-center gap-1.5 rounded-[9px] bg-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
            >
              <IconImage width={15} height={15} />
              Choose from Media
            </button>
            <button
              type="button"
              onClick={() => setPicker("upload")}
              className="inline-flex h-11 items-center gap-1.5 rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink hover:bg-white/60"
            >
              <IconPlus width={15} height={15} />
              Upload new
            </button>
          </div>
          {hint ? <p className={hintClass}>{hint}</p> : null}
        </div>
      )}

      <MediaPicker
        open={picker !== null}
        initialTab={picker ?? "library"}
        onClose={() => setPicker(null)}
        onSelect={handleSelect}
        folder={folder}
        title={label}
      />
    </div>
  );
}
