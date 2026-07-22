import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth/session";
import { requirePermission, PermissionError, AuthRequiredError } from "@/lib/rbac/guard";
import { isMediaFolder } from "@/lib/storage/folders";
import { storage } from "@/lib/storage";
import { processImage, makeThumbnail, imageProfile } from "@/lib/storage/image";

/**
 * Admin image upload (§ Media Storage). Guarded by the same RBAC as media
 * creation, the raw browser upload is Sharp-normalized to compressed WebP and
 * persisted through the StorageService — the app never touches the filesystem
 * here. Returns the servable path the caller records on its entity.
 */
export const runtime = "nodejs"; // Sharp requires the Node.js runtime.

// Raw upload cap. Sized so a genuine full-resolution hero original (a 4K–6K
// camera JPEG) is accepted rather than rejected before Sharp ever sees it.
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  try {
    const actor = await getCurrentActor();
    requirePermission(actor, "media", "create");

    const form = await request.formData();
    const file = form.get("file");
    const folderRaw = form.get("folder");
    const folder = typeof folderRaw === "string" ? folderRaw : "gallery";

    if (!isMediaFolder(folder)) {
      return NextResponse.json({ error: "Unknown media folder." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 20 MB)." }, { status: 413 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are accepted." }, { status: 415 });
    }

    const raw = Buffer.from(await file.arrayBuffer());
    let processed;
    try {
      processed = await processImage(raw, folder);
    } catch {
      return NextResponse.json({ error: "Could not read that image." }, { status: 422 });
    }

    const baseName = file.name.replace(/\.[^./\\]+$/, "");
    const { path } = await storage.upload({
      folder,
      data: processed.data,
      ext: processed.format,
      contentType: "image/webp",
      baseName,
    });

    // A tiny cover-cropped companion so grids and the Media Picker never pull
    // full-size heroes down the wire. Best-effort: a thumbnail failure must not
    // cost the admin the upload — consumers fall back to the full asset.
    let thumbPath: string | undefined;
    try {
      const thumb = await makeThumbnail(processed.data);
      thumbPath = (
        await storage.upload({
          folder,
          data: thumb.data,
          ext: thumb.format,
          contentType: "image/webp",
          baseName: `${baseName}-thumb`,
        })
      ).path;
    } catch (err) {
      console.error("[media/upload] thumbnail failed:", err);
    }

    // Sharp never upscales, so an undersized original stays undersized and gets
    // stretched by CSS at render time. The upload still succeeds — we just tell
    // the admin, because nothing downstream can recover the missing detail.
    const { recommendedMinWidth } = imageProfile(folder);
    const warning =
      processed.width < recommendedMinWidth
        ? `This image is only ${processed.width}px wide. For a ${folder} image, upload at least ${recommendedMinWidth}px wide or it will look soft when displayed.`
        : undefined;

    return NextResponse.json({
      path,
      thumbPath,
      width: processed.width,
      height: processed.height,
      bytes: processed.data.byteLength,
      format: processed.format,
      warning,
    });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("[media/upload] failed:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
