/**
 * Media folder taxonomy — client-safe constants (no `server-only` import), so
 * both client pickers and server code share one source of truth. Every upload
 * lands in one of these subfolders under the uploads root (§ Media Storage).
 */
export const MEDIA_FOLDERS = [
  "tours",
  "hero",
  "blog",
  "destinations",
  "guides",
  "gallery",
  "marketing",
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export function isMediaFolder(value: string): value is MediaFolder {
  return (MEDIA_FOLDERS as readonly string[]).includes(value);
}
