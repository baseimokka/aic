import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched paths under a valid locale (e.g. /en/no-such-page).
 * Defined routes always win over a catch-all, so this only fires for genuinely
 * unknown URLs and routes them to the localized, site-chromed 404 — without it
 * they would fall through to Next's unbranded default page (CLAUDE.md §3).
 */
export default function CatchAllNotFound(): never {
  notFound();
}
