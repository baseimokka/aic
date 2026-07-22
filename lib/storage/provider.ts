import type { MediaFolder } from "./folders";

/**
 * Provider-agnostic media storage contract (§ Media Storage). The application
 * talks **only** to this interface — never to the filesystem or a vendor SDK
 * directly — so moving from local-VPS disk to S3, DigitalOcean Spaces, etc. is
 * a single new adapter with zero business-logic changes.
 *
 * The stored value returned by `upload()` (and accepted by the other methods) is
 * a servable relative path, e.g. `/uploads/tours/luxor-01.webp`. That path is
 * what gets persisted in Postgres.
 */

export interface UploadInput {
  folder: MediaFolder;
  /** Object bytes to persist (already encoded — e.g. WebP from the image pipeline). */
  data: Buffer;
  /** File extension without the dot, e.g. `"webp"`. */
  ext: string;
  /** MIME type, e.g. `"image/webp"` (used by remote providers; ignored locally). */
  contentType: string;
  /** Optional human-readable base name; a random suffix is always appended. */
  baseName?: string;
}

export interface StorageProvider {
  /** Persist an object and return its servable relative path. */
  upload(input: UploadInput): Promise<{ path: string }>;
  /** Remove a previously stored object (no-op if it's already gone). */
  delete(path: string): Promise<void>;
  /** Resolve a stored path to a browser-loadable URL. */
  getUrl(path: string): string;
  /** Whether an object still exists in the backing store. */
  exists(path: string): Promise<boolean>;
}
