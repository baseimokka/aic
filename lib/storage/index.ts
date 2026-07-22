import "server-only";
import { LocalStorageProvider } from "./local";
import type { StorageProvider } from "./provider";

/**
 * StorageService entry point (§ Media Storage). Provider selection lives behind
 * one env switch — the seam where an S3 / DigitalOcean Spaces adapter plugs in
 * later without touching a single call site. V1 ships `local` only; no external
 * media service is permitted unless a future version explicitly approves one.
 */
function createStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  switch (provider) {
    case "local":
      return new LocalStorageProvider();
    default:
      throw new Error(`Unknown STORAGE_PROVIDER "${provider}". Supported: local.`);
  }
}

/** The application-wide storage singleton. Import this, never a provider directly. */
export const storage: StorageProvider = createStorage();

export type { StorageProvider, UploadInput } from "./provider";
export { MEDIA_FOLDERS, isMediaFolder, type MediaFolder } from "./folders";
