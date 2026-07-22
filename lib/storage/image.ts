import "server-only";
import sharp from "sharp";
import type { MediaFolder } from "./folders";

/**
 * Local image processing pipeline (§ Media Storage). Every uploaded image is
 * normalized with Sharp: EXIF-rotated, downscaled if oversized, and re-encoded
 * as compressed WebP for fast, Core-Web-Vitals-friendly delivery. Kept separate
 * from the StorageService so persistence stays provider-agnostic.
 */

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  format: "webp";
}

const MAX_WIDTH = 2000; // downscale oversized originals (never upscale)
const QUALITY = 80;
const THUMB_SIZE = 400;

interface ImageProfile {
  /** Ceiling for the stored file; originals below it are never upscaled. */
  maxWidth: number;
  /** WebP quality of this first (and only stored) encode. */
  quality: number;
  /** Below this the asset is too small for its slot — surfaced to the admin. */
  recommendedMinWidth: number;
  /**
   * High-quality chroma subsampling. Costs a little size, but keeps saturated
   * colour edges (Egypt golds, deep navies) from smearing at large display
   * sizes. Only worth it where the image is shown big.
   */
  smartSubsample: boolean;
  /** Sharp WebP effort (0–6). Higher = smaller file, more CPU at upload time. */
  effort: number;
}

/**
 * Per-slot encode profiles. Hero banners are the exception to the shared
 * defaults: they are painted full-bleed at 100vw behind a ≥640px-tall section,
 * so they need enough pixels to survive a wide/retina viewport *and* the
 * Ken Burns magnification (globals.css `.hero-kenburns` scales to 1.10). They
 * are also re-encoded a second time by next/image on delivery, so the stored
 * copy is kept at a higher quality to leave headroom for that generation loss.
 */
const DEFAULT_PROFILE: ImageProfile = {
  maxWidth: MAX_WIDTH,
  quality: QUALITY,
  recommendedMinWidth: 1200,
  smartSubsample: false, // unchanged encode for cards, thumbnails, body imagery
  effort: 4, // Sharp's default
};

const PROFILES: Partial<Record<MediaFolder, ImageProfile>> = {
  hero: {
    maxWidth: 2880,
    quality: 88,
    recommendedMinWidth: 1920,
    smartSubsample: true,
    effort: 5,
  },
};

export function imageProfile(folder?: MediaFolder): ImageProfile {
  return (folder && PROFILES[folder]) ?? DEFAULT_PROFILE;
}

/**
 * Convert any supported input to compressed WebP, downscaled to the slot's
 * ceiling. Never upscales — an undersized original stays undersized (callers
 * should warn rather than fabricate pixels).
 */
export async function processImage(input: Buffer, folder?: MediaFolder): Promise<ProcessedImage> {
  const { maxWidth, quality, smartSubsample, effort } = imageProfile(folder);
  const base = sharp(input, { failOn: "error" }).rotate(); // honor EXIF orientation
  const meta = await base.metadata();
  const sized =
    meta.width && meta.width > maxWidth
      ? base.resize({ width: maxWidth, withoutEnlargement: true })
      : base;
  const data = await sized.webp({ quality, smartSubsample, effort }).toBuffer();
  const out = await sharp(data).metadata();
  return { data, width: out.width ?? 0, height: out.height ?? 0, format: "webp" };
}

/** Square, cover-cropped WebP thumbnail for grid/list previews. */
export async function makeThumbnail(input: Buffer, size = THUMB_SIZE): Promise<ProcessedImage> {
  const data = await sharp(input)
    .rotate()
    .resize({ width: size, height: size, fit: "cover" })
    .webp({ quality: 70 })
    .toBuffer();
  const out = await sharp(data).metadata();
  return { data, width: out.width ?? 0, height: out.height ?? 0, format: "webp" };
}
