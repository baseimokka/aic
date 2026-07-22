"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/storage/folders";
import { uploadMedia } from "@/lib/storage/upload-client";
import { registerMedia } from "@/app/[locale]/(admin)/dashboard/media/actions";
import { controlClass, labelClass, SelectField } from "@/components/admin/form";

/** Upload panel for the Media Library — Sharp-processed local upload (§ Media Storage). */
export function MediaUploader() {
  const router = useRouter();
  const [folder, setFolder] = useState<MediaFolder>("gallery");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Same sequential flow as the Media Picker's upload tab: one request per file
  // so the Sharp pipeline never runs parallel 20 MB encodes, a shared alt text
  // numbered per asset, and a stop on the first failure so everything already
  // uploaded is kept and the failing file is named.
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
    for (const [index, file] of files.entries()) {
      setProgress({ current: index + 1, total: files.length });
      try {
        const asset = await uploadMedia(file, folder);
        if (asset.warning) setWarning(files.length > 1 ? `${file.name}: ${asset.warning}` : asset.warning);
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
          setError(files.length > 1 ? `${file.name}: ${res.error}` : res.error);
          break;
        }
        added += 1;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        setError(files.length > 1 ? `${file.name}: ${message}` : message);
        break;
      }
    }
    if (added > 0) {
      setAlt("");
      setNote(`${added} image${added > 1 ? "s" : ""} added to the library.`);
      router.refresh();
    }
    setBusy(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-extrabold text-ink">Add media</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="m-folder" className={labelClass}>Folder</label>
          <SelectField id="m-folder" value={folder} onChange={(e) => setFolder(e.target.value as MediaFolder)}>
            {MEDIA_FOLDERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </SelectField>
        </div>
        <div>
          <label htmlFor="m-alt" className={labelClass}>Alt text <span className="text-accent">*</span></label>
          <input id="m-alt" type="text" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" className={controlClass} />
        </div>
      </div>

      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void handleFiles(files);
          }}
          className="block w-full text-[13px] text-ink file:me-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-[13px] file:font-bold file:text-white hover:file:opacity-90"
        />
        <p className="mt-2 text-[12px] text-faint">
          {busy && progress
            ? `Uploading ${progress.current} of ${progress.total}…`
            : "JPG, PNG or WebP — converted to compressed WebP automatically. Select several to upload at once (max 20 MB each)."}
        </p>
      </div>

      <div className="mt-2 min-h-[18px] text-xs font-semibold" role="status" aria-live="polite">
        {error ? <span className="text-danger">{error}</span> : note ? <span className="text-success-deep">{note}</span> : null}
      </div>
      {warning ? <p className="text-[11.5px] font-semibold text-accent">{warning}</p> : null}
    </div>
  );
}
