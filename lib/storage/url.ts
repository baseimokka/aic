/**
 * Map a stored media path to a browser URL — client-safe (no server-only import
 * or secrets), so previews and server components share one resolver.
 *
 * With local VPS storage the stored value is already the servable relative path
 * (e.g. `/uploads/tours/luxor-01.webp`), so this is essentially identity. A
 * future CDN or bucket only needs `NEXT_PUBLIC_MEDIA_BASE_URL` set to prepend an
 * origin — no call site changes (provider-agnostic, § Media Storage).
 */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "") ?? "";
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
