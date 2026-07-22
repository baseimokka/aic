import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { StorageProvider, UploadInput } from "./provider";

/**
 * Local filesystem storage provider (§ Media Storage) — the V1 standard, files
 * live on the VPS. Physical root defaults to a top-level `uploads/` dir (outside
 * the Next build so it survives redeploys); override with `UPLOADS_DIR` to point
 * at a persistent volume. Files are served under `/uploads/*` — by nginx in
 * production and by `app/uploads/[...path]` in development.
 */

// Absolute physical root for stored files.
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

// Public URL prefix these files are served under — kept in lockstep with the
// `app/uploads/[...path]` route handler and the nginx location block.
const URL_BASE = "/uploads";

function uniqueName(baseName: string | undefined): string {
  const slug =
    (baseName ?? "img")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "img";
  return `${slug}-${randomBytes(6).toString("hex")}`;
}

/**
 * Resolve a stored `/uploads/<folder>/<file>` path to an absolute filesystem
 * path, refusing anything that escapes the uploads root (path-traversal guard).
 * Returns `null` for a path that would resolve outside `UPLOADS_ROOT`.
 */
export function resolveUploadPath(storedPath: string): string | null {
  const rel = storedPath.replace(/^\/+/, "").replace(/^uploads\/?/, "");
  const abs = path.resolve(UPLOADS_ROOT, rel);
  if (abs !== UPLOADS_ROOT && !abs.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return abs;
}

export class LocalStorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<{ path: string }> {
    const dir = path.join(UPLOADS_ROOT, input.folder);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${uniqueName(input.baseName)}.${input.ext}`;
    await fs.writeFile(path.join(dir, filename), input.data);
    return { path: `${URL_BASE}/${input.folder}/${filename}` };
  }

  async delete(storedPath: string): Promise<void> {
    const abs = resolveUploadPath(storedPath);
    if (!abs) return;
    await fs.rm(abs, { force: true });
  }

  getUrl(storedPath: string): string {
    // The stored value is already the servable relative path.
    return storedPath;
  }

  async exists(storedPath: string): Promise<boolean> {
    const abs = resolveUploadPath(storedPath);
    if (!abs) return false;
    try {
      await fs.access(abs);
      return true;
    } catch {
      return false;
    }
  }
}
