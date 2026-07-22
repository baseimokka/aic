"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/storage/folders";
import { mediaUrl } from "@/lib/storage/url";
import { previewPath, type MediaItem, type MediaListResponse } from "@/lib/storage/media-item";
import { uploadMedia } from "@/lib/storage/upload-client";
import { registerMedia } from "@/app/[locale]/(admin)/dashboard/media/actions";
import { formatBytes, formatDate } from "@/lib/utils";
import { controlClass } from "@/components/admin/form";
import { IconCheck, IconClose, IconSearch } from "@/components/admin/icons";

/**
 * The reusable Media Picker (§ Media Storage) — one dialog behind every image
 * field in the console, so the library is a true single source of truth:
 * choosing an existing asset reuses its record and file, never a copy.
 *
 * Browsing needs `media:view`; the Upload tab appears only for `media:create`
 * (the upload route enforces the same guard server-side). Paging is cursor
 * based and thumbnails are lazy, so the library never loads all at once.
 */

/**
 * One page of the library. State-free by design so it can be called from an
 * effect body without triggering a synchronous render cascade.
 */
async function fetchPage({
  q,
  folder,
  cursor,
}: {
  q: string;
  folder: MediaFolder | "";
  cursor: string | null;
}): Promise<MediaListResponse> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (folder) params.set("folder", folder);
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/admin/media/list?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not load media.");
  }
  return (await res.json()) as MediaListResponse;
}

export function MediaPicker({
  open,
  onClose,
  onSelect,
  folder,
  multiple = false,
  initialTab = "library",
  title = "Media library",
}: {
  open: boolean;
  onClose: () => void;
  /** Receives the chosen asset(s); the dialog closes itself afterwards. */
  onSelect: (items: MediaItem[]) => void;
  /** Default folder for uploads and the initial browse filter. */
  folder: MediaFolder;
  multiple?: boolean;
  initialTab?: "library" | "upload";
  title?: string;
}) {
  if (!open) return null;
  return (
    <PickerDialog
      onClose={onClose}
      onSelect={onSelect}
      folder={folder}
      multiple={multiple}
      initialTab={initialTab}
      title={title}
    />
  );
}

function PickerDialog({
  onClose,
  onSelect,
  folder,
  multiple,
  initialTab,
  title,
}: {
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  folder: MediaFolder;
  multiple: boolean;
  initialTab: "library" | "upload";
  title: string;
}) {
  const [tab, setTab] = useState<"library" | "upload">(initialTab);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** null until the first response tells us — avoids flashing the wrong tabs. */
  const [canUpload, setCanUpload] = useState<boolean | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced value actually sent
  const [folderFilter, setFolderFilter] = useState<MediaFolder | "">(folder);
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [focused, setFocused] = useState<MediaItem | null>(null);

  const searchId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /** Guards against a stale page landing after the filters changed. */
  const requestRef = useRef(0);
  /**
   * True while any page is in flight. The scroll sentinel checks it so it can't
   * append using a cursor that belongs to the filter set being replaced.
   */
  const inFlightRef = useRef(false);

  // Escape closes; focus lands on the dialog so keyboard users start inside it.
  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Debounce typing so each keystroke isn't a request.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // First page (and every filter change). Results replace the list rather than
  // appending, so what's on screen stays put until the new page lands instead of
  // flashing empty. A stale response that lost the race is discarded.
  useEffect(() => {
    const ticket = ++requestRef.current;
    inFlightRef.current = true;
    void (async () => {
      try {
        const data = await fetchPage({ q: query, folder: folderFilter, cursor: null });
        if (ticket !== requestRef.current) return;
        setCanUpload(data.canUpload);
        setItems(data.items);
        setCursor(data.nextCursor);
        setDone(data.nextCursor === null);
        setError(null);
      } catch (e) {
        if (ticket !== requestRef.current) return;
        setError(e instanceof Error ? e.message : "Could not load media.");
        setDone(true);
      } finally {
        if (ticket === requestRef.current) {
          inFlightRef.current = false;
          setLoading(false);
        }
      }
    })();
  }, [query, folderFilter]);

  /** Append the next page — called from the scroll observer, never an effect body. */
  const loadMore = useCallback(
    async (next: string) => {
      const ticket = ++requestRef.current;
      inFlightRef.current = true;
      setLoading(true);
      try {
        const data = await fetchPage({ q: query, folder: folderFilter, cursor: next });
        if (ticket !== requestRef.current) return;
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setDone(data.nextCursor === null);
      } catch (e) {
        if (ticket !== requestRef.current) return;
        setError(e instanceof Error ? e.message : "Could not load media.");
        setDone(true);
      } finally {
        if (ticket === requestRef.current) {
          inFlightRef.current = false;
          setLoading(false);
        }
      }
    },
    [query, folderFilter],
  );

  // Infinite scroll: fetch the next page as the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done || loading || tab !== "library") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !inFlightRef.current) void loadMore(cursor);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, done, loading, loadMore, tab]);

  function toggle(item: MediaItem) {
    setFocused(item);
    setSelected((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (multiple) return exists ? prev.filter((s) => s.id !== item.id) : [...prev, item];
      return exists ? [] : [item];
    });
  }

  function confirm() {
    if (selected.length === 0) return;
    onSelect(selected);
    onClose();
  }

  /** Freshly uploaded assets jump to the top of the grid and pre-select. */
  function onUploaded(item: MediaItem) {
    setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
    setFocused(item);
    setSelected((prev) => (multiple ? [...prev, item] : [item]));
    setTab("library");
  }

  const detail = focused ?? selected.at(-1) ?? null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="Close media library" onClick={onClose} className="absolute inset-0 bg-ink/50" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="shadow-pop relative z-10 flex h-full max-h-[880px] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-line bg-white"
      >
        {/* ── Header: title, tabs, close ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-ink">{title}</h2>
            {multiple ? (
              <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                {selected.length} selected
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-[9px] border border-line-input p-0.5">
              <TabButton active={tab === "library"} onClick={() => setTab("library")}>
                Library
              </TabButton>
              {canUpload === true ? (
                <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
                  Upload new
                </TabButton>
              ) : null}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line-input text-muted hover:bg-cream hover:text-ink"
            >
              <IconClose width={16} height={16} />
            </button>
          </div>
        </div>

        {tab === "upload" && canUpload === null ? (
          // Permissions arrive with the first page; hold the pane rather than
          // flashing the library at someone who asked to upload.
          <p className="flex-1 p-8 text-center text-sm text-muted">Opening uploader…</p>
        ) : tab === "upload" && canUpload ? (
          <UploadPane defaultFolder={folder} multiple={multiple} onUploaded={onUploaded} />
        ) : (
          <>
            {/* ── Filters ── */}
            <div className="space-y-2.5 border-b border-line-soft px-4 py-3 sm:px-5">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-faint">
                  <IconSearch width={16} height={16} />
                </span>
                <input
                  id={searchId}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by alt text or file name"
                  aria-label="Search media"
                  className={`${controlClass} h-11 ps-9`}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FolderChip active={folderFilter === ""} onClick={() => setFolderFilter("")} label="All folders" />
                {MEDIA_FOLDERS.map((f) => (
                  <FolderChip key={f} active={folderFilter === f} onClick={() => setFolderFilter(f)} label={f} />
                ))}
              </div>
            </div>

            {/* ── Grid + detail rail ── */}
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {error ? (
                  <p role="alert" className="mb-3 text-[13px] font-semibold text-danger">
                    {error}
                  </p>
                ) : null}

                {items.length === 0 && !loading ? (
                  <p className="py-10 text-center text-sm text-muted">
                    {query || folderFilter
                      ? "No media matches those filters."
                      : "The library is empty — upload the first image."}
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((item) => {
                      const isSelected = selected.some((s) => s.id === item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => toggle(item)}
                            aria-pressed={isSelected}
                            className={`group relative block w-full overflow-hidden rounded-xl border-2 bg-surface-2 text-start transition-colors ${
                              isSelected ? "border-accent" : "border-transparent hover:border-line-input"
                            }`}
                          >
                            {/* Plain img + native lazy loading: sources are already
                                thumbnail-sized WebP, so next/image adds nothing here. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={mediaUrl(previewPath(item)) ?? ""}
                              alt={item.alt}
                              loading="lazy"
                              decoding="async"
                              className="aspect-square w-full object-cover"
                            />
                            {isSelected ? (
                              <span className="absolute end-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                                <IconCheck width={14} height={14} />
                              </span>
                            ) : null}
                            <span className="block truncate bg-white px-2 py-1.5 text-[11.5px] font-semibold text-ink-soft">
                              {item.alt}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div ref={sentinelRef} className="h-8" />
                {loading ? <p className="py-2 text-center text-xs font-semibold text-faint">Loading…</p> : null}
                {done && items.length > 0 ? (
                  <p className="py-2 text-center text-xs text-faint">End of library</p>
                ) : null}
              </div>

              <aside className="border-t border-line-soft p-4 lg:w-[260px] lg:flex-shrink-0 lg:border-s lg:border-t-0 lg:p-5">
                {detail ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(detail.path) ?? ""}
                      alt={detail.alt}
                      className="max-h-[180px] w-full rounded-xl border border-line bg-surface-2 object-contain"
                    />
                    <p className="text-[13px] font-bold leading-snug text-ink">{detail.alt}</p>
                    <dl className="space-y-1 text-[11.5px] text-muted">
                      <MetaRow label="Folder" value={detail.type} />
                      <MetaRow
                        label="Dimensions"
                        value={detail.width && detail.height ? `${detail.width} × ${detail.height}` : "—"}
                      />
                      <MetaRow label="Size" value={formatBytes(detail.bytes) ?? "—"} />
                      <MetaRow label="Uploaded" value={formatDate(new Date(detail.createdAt))} />
                    </dl>
                    <p className="break-all font-mono text-[10.5px] text-faint">{detail.path}</p>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">Select an image to see its details.</p>
                )}
              </aside>
            </div>

            {/* ── Footer actions ── */}
            <div className="flex items-center justify-end gap-2.5 border-t border-line-soft bg-cream px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center rounded-[9px] border-[1.5px] border-line-input bg-white px-4 text-[13px] font-bold text-ink-soft hover:bg-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={selected.length === 0}
                className="inline-flex h-11 items-center rounded-[9px] bg-ink px-5 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40"
              >
                {multiple && selected.length > 1 ? `Add ${selected.length} images` : "Use image"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Upload tab — same Sharp → StorageService path as the Media Library page, then
 * registers the asset so it becomes selectable immediately without closing.
 */
function UploadPane({
  defaultFolder,
  multiple,
  onUploaded,
}: {
  defaultFolder: MediaFolder;
  multiple: boolean;
  onUploaded: (item: MediaItem) => void;
}) {
  const [folder, setFolder] = useState<MediaFolder>(defaultFolder);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    setError(null);
    setWarning(null);
    setNote(null);
    if (!alt.trim()) {
      setError("Add alt text before uploading (required for accessibility).");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    let added = 0;
    try {
      for (const [index, file] of files.entries()) {
        const asset = await uploadMedia(file, folder);
        if (asset.warning) setWarning(asset.warning);
        // Multiple files share the typed description, numbered so each asset
        // still carries distinct alt text rather than a duplicate.
        const altText = files.length > 1 ? `${alt.trim()} (${index + 1})` : alt.trim();
        const res = await registerMedia({
          path: asset.path,
          thumbPath: asset.thumbPath,
          type: folder,
          alt: altText,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
          format: asset.format,
        });
        if (!res.ok) {
          setError(res.error);
          break;
        }
        onUploaded(res.item);
        added += 1;
      }
      if (added > 0) {
        setAlt("");
        setNote(`${added} image${added > 1 ? "s" : ""} added to the library and selected.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border-[1.5px] border-dashed border-line-input bg-cream p-5">
        <div>
          <label htmlFor="mp-folder" className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
            Folder
          </label>
          <select
            id="mp-folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value as MediaFolder)}
            className={controlClass}
          >
            {MEDIA_FOLDERS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="mp-alt" className="mb-1 block text-[11px] font-bold uppercase tracking-[0.05em] text-muted">
            Alt text <span className="text-accent">*</span>
          </label>
          <input
            id="mp-alt"
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image for screen readers"
            className={controlClass}
          />
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length) void handleFiles(files);
            }}
            className="block w-full text-[13px] text-ink file:me-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-[13px] file:font-bold file:text-white hover:file:opacity-90"
          />
          <p className="mt-2 text-[11px] text-faint">
            {busy ? "Uploading…" : "JPG, PNG or WebP — converted to compressed WebP automatically. Max 20 MB each."}
          </p>
        </div>

        <div className="min-h-[18px] text-[11.5px] font-semibold" role="status" aria-live="polite">
          {error ? <span className="text-danger">{error}</span> : null}
          {!error && note ? <span className="text-success-deep">{note}</span> : null}
        </div>
        {warning ? <p className="text-[11.5px] font-semibold text-accent">{warning}</p> : null}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center rounded-[7px] px-3 text-xs font-bold ${
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-cream"
      }`}
    >
      {children}
    </button>
  );
}

function FolderChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[32px] items-center rounded-full border px-3 text-xs font-semibold ${
        active ? "border-ink bg-ink text-white" : "border-line-input bg-white text-ink-soft hover:bg-cream"
      }`}
    >
      {label}
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-faint">{label}</dt>
      <dd className="truncate font-semibold text-ink-soft">{value}</dd>
    </div>
  );
}
