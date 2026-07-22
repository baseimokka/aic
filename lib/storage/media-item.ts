/**
 * The wire shape of a Media Library asset (§ Media Storage). Shared by the list
 * endpoint, the Media Picker and every image field, so a selected asset carries
 * its own metadata instead of each call site re-deriving it from a bare path.
 *
 * Client-safe: no `server-only` import, no Prisma types.
 */
export interface MediaItem {
  id: string;
  /** Servable path of the full-size asset — this is what entities persist. */
  path: string;
  /** Small cover-cropped preview; null for assets uploaded before thumbnails. */
  thumbPath: string | null;
  type: string;
  alt: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
  /** ISO timestamp — serialized for transport, formatted at the edge. */
  createdAt: string;
}

export interface MediaListResponse {
  items: MediaItem[];
  /** Pass back as `cursor` for the next page; null when the list is exhausted. */
  nextCursor: string | null;
  /** Whether this actor may upload — the picker hides its upload tab otherwise. */
  canUpload: boolean;
}

/** Prefer the thumbnail in grids; fall back to the full asset when absent. */
export function previewPath(item: Pick<MediaItem, "path" | "thumbPath">): string {
  return item.thumbPath ?? item.path;
}
