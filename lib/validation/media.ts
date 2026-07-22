import { z } from "zod";
import { MEDIA_FOLDERS } from "@/lib/storage/folders";

/** Media Library mutations (§ Media Storage). Alt text is required on every asset (WCAG AA). */

export const mediaTypeSchema = z.enum(MEDIA_FOLDERS);

const storedPathSchema = z
  .string()
  .trim()
  .min(1, "A media path is required.")
  .max(300)
  .startsWith("/uploads/", "Media paths must live under /uploads/.");

export const registerMediaSchema = z.object({
  path: storedPathSchema,
  thumbPath: storedPathSchema.optional(),
  type: mediaTypeSchema,
  alt: z.string().trim().min(1, "Alt text is required for accessibility.").max(300),
  width: z.number().int().positive().max(100_000).optional(),
  height: z.number().int().positive().max(100_000).optional(),
  bytes: z.number().int().nonnegative().optional(),
  format: z.string().trim().max(20).optional(),
});
export type RegisterMediaInput = z.infer<typeof registerMediaSchema>;

/** Query for the paginated media browser behind the Media Picker. */
export const mediaListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  folder: mediaTypeSchema.optional(),
  /** Opaque cursor — the id of the last item on the previous page. */
  cursor: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  /** Look up specific stored paths (used to hydrate an already-saved field). */
  paths: z.array(storedPathSchema).max(50).optional(),
});
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

export const mediaAltSchema = z.object({
  alt: z.string().trim().min(1, "Alt text is required for accessibility.").max(300),
});
