/**
 * Localized 404 for the public site segment (CLAUDE.md §3). Lives inside
 * `(site)` so it renders with the site header/footer; `notFound()` raised by
 * site pages (unknown tour/blog/destination slugs, the catch-all route)
 * resolves here. `app/[locale]/not-found.tsx` remains the bare fallback for
 * segments outside `(site)`.
 */
export { default } from "../not-found";
