import Image from "next/image";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/storage/url";

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/**
 * Image surface (server component). Renders a stored media file via next/image
 * when a `path` is present (locally stored WebP, already compressed by the Sharp
 * pipeline — § Media Storage); otherwise a deterministic, on-brand gradient
 * placeholder — intentional, not a broken image.
 */
export function MediaImage({
  path,
  alt,
  className,
  rounded = true,
  sizes = "100vw",
  priority = false,
  fit = "cover",
  quality,
}: {
  path: string | null;
  alt: string;
  className?: string;
  rounded?: boolean;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  /** Must be listed in `images.qualities` (next.config.ts). Defaults to 75. */
  quality?: number;
}) {
  const containerClass = cn(
    "relative isolate overflow-hidden bg-surface-2",
    rounded && "rounded-2xl",
    className,
  );

  const src = mediaUrl(path);
  if (src) {
    return (
      <div className={containerClass}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={quality}
          className={fit === "contain" ? "object-contain" : "object-cover"}
        />
      </div>
    );
  }

  const hue = hashHue(path ?? alt);
  return (
    <div
      role="img"
      aria-label={alt}
      className={containerClass}
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue} 34% 82%), hsl(${(hue + 42) % 360} 46% 66%))` }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.38),transparent_60%)]"
      />
    </div>
  );
}
