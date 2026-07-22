"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mediaUrl } from "@/lib/storage/url";
import { ArchiveDialog } from "@/components/admin/archive-dialog";
import { updateMediaAlt, archiveMedia, restoreMedia } from "@/app/[locale]/(admin)/dashboard/media/actions";
import { controlClass } from "@/components/admin/form";
import { formatBytes, formatDate } from "@/lib/utils";

export interface MediaCardItem {
  id: string;
  path: string;
  thumbPath: string | null;
  alt: string;
  type: string;
  archived: boolean;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string;
}

export function MediaCard({
  item,
  canEdit,
  canArchive,
}: {
  item: MediaCardItem;
  canEdit: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [alt, setAlt] = useState(item.alt);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveAlt() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("alt", alt);
      const res = await updateMediaAlt(item.id, fd);
      if (!res.ok) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="relative aspect-[4/3] bg-surface-2">
        {/* Thumbnail first — the full asset is only fetched where it's displayed large. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(item.thumbPath ?? item.path) ?? ""}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <span className="absolute start-2 top-2 rounded-md bg-ink/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{item.type}</span>
      </div>
      <div className="space-y-2 p-3">
        {canEdit ? (
          <div className="flex gap-1.5">
            <input aria-label="Alt text" value={alt} onChange={(e) => { setAlt(e.target.value); setSaved(false); }} className={`${controlClass} h-9 text-[13px]`} />
            <button type="button" disabled={pending} onClick={saveAlt} className="inline-flex h-9 flex-shrink-0 items-center rounded-lg border border-line-input bg-white px-3 text-xs font-bold text-ink hover:bg-cream disabled:opacity-60">Save</button>
          </div>
        ) : (
          <p className="truncate text-[13px] text-ink-soft">{item.alt}</p>
        )}
        <p className="truncate text-[11px] text-faint">
          {[
            item.width && item.height ? `${item.width}×${item.height}` : null,
            formatBytes(item.bytes),
            formatDate(new Date(item.createdAt)),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold" role="status" aria-live="polite">
            {error ? <span className="text-danger">{error}</span> : saved ? <span className="text-success-deep">Saved</span> : null}
          </span>
          {canArchive ? (
            <ArchiveDialog id={item.id} archived={item.archived} name={item.alt || item.path} entityLabel="asset" archiveAction={archiveMedia} restoreAction={restoreMedia} size="compact" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
