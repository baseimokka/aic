/**
 * URL-safe slug from arbitrary text. Slugs are locale-independent routing keys
 * (§7) and must survive reseeds, so they live on base tables and are indexed.
 *
 * NFKD decomposes accented letters into base + combining mark; the [^a-z0-9]
 * pass then drops the marks (and every other non-alphanumeric) to hyphens.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Resolve a collision-free slug by appending -2, -3, … until `exists` returns
 * false. Caller supplies the existence check so this stays model-agnostic.
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = base || "item";
  let candidate = root;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}
