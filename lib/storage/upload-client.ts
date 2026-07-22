import type { MediaFolder } from "./folders";

/**
 * Client-side upload helper (§ Media Storage). The browser POSTs the raw file to
 * our server route, which runs the Sharp pipeline and persists it through the
 * StorageService, returning the servable path. No secrets here — safe to import
 * from client components.
 */

export interface UploadedAsset {
  path: string;
  /** Cover-cropped preview stored alongside the asset, for grids and pickers. */
  thumbPath?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  /** Non-blocking advisory (e.g. the image is too small for its slot). */
  warning?: string;
}

export async function uploadMedia(file: File, folder: MediaFolder): Promise<UploadedAsset> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const res = await fetch("/api/admin/media/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Upload failed.");
  }
  return (await res.json()) as UploadedAsset;
}
