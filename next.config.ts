import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Media is served locally from /uploads (same-origin), so next/image needs no
  // remotePatterns — it optimizes the pre-compressed WebP files directly
  // (§ Media Storage).
  images: {
    // Next 16 rejects any quality not listed here (400 from the optimizer), so
    // the full-bleed hero can only opt out of the default 75 if 85 is declared.
    // 75 stays the default for cards, thumbnails and body imagery.
    qualities: [75, 85],
    // Stored filenames carry a random suffix (see lib/storage/local.ts), so a
    // path is immutable — a re-upload always produces a new URL. The optimizer
    // cache can therefore be held far longer than the 4h default.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  experimental: {
    // The catalog/detail pages are prerendered against a serverless Neon
    // compute that autosuspends. A full build fans out many concurrent page
    // renders at once, and a cold compute can momentarily refuse the burst
    // ("Can't reach database server"). Cap the concurrency so the wake-up
    // isn't outrun, and retry transient failures a few times.
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 4,
  },
};

export default nextConfig;
