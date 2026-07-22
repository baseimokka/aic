import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { resolveUploadPath } from "@/lib/storage/local";

/**
 * Serve persisted uploads from the storage root (§ Media Storage). In production
 * nginx serves `/uploads/*` directly from the volume for performance and this
 * handler is the fallback; in development it is the only server. Path traversal
 * is blocked by `resolveUploadPath`.
 */
export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const abs = resolveUploadPath(`/uploads/${segments.join("/")}`);
  if (!abs) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await fs.readFile(abs);
    const ext = abs.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
