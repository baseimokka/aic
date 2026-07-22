import type { ReviewSource } from "@prisma/client";

/**
 * Review source vocabulary — where a review was originally received. Admin
 * records this manually in V1; a future Google-import job would set GOOGLE
 * programmatically. Labels are admin-dashboard chrome (English-only, §3).
 */
export const REVIEW_SOURCES = ["WEBSITE", "GOOGLE", "WHATSAPP", "EMAIL", "FACEBOOK", "OTHER"] as const;

export const REVIEW_SOURCE_LABELS: Record<ReviewSource, string> = {
  WEBSITE: "Website",
  GOOGLE: "Google",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  FACEBOOK: "Facebook",
  OTHER: "Other",
};

export const REVIEW_RATINGS = [5, 4, 3, 2, 1] as const;
