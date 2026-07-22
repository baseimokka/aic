-- Cloudinary → local filesystem storage: rename media identifier columns from
-- Cloudinary `publicId` terminology to neutral, provider-agnostic path columns.
-- Column renames preserve existing rows (values are re-pointed to /uploads/* on reseed).

ALTER TABLE "TourImage" RENAME COLUMN "publicId" TO "path";
ALTER TABLE "TourTranslation" RENAME COLUMN "ogImagePublicId" TO "ogImagePath";
ALTER TABLE "Destination" RENAME COLUMN "heroImagePublicId" TO "heroImagePath";
ALTER TABLE "Testimonial" RENAME COLUMN "avatarPublicId" TO "avatarPath";
ALTER TABLE "HeroBanner" RENAME COLUMN "imagePublicId" TO "imagePath";
ALTER TABLE "BlogPost" RENAME COLUMN "coverImagePublicId" TO "coverImagePath";
ALTER TABLE "BlogPostTranslation" RENAME COLUMN "ogImagePublicId" TO "ogImagePath";

ALTER TABLE "Media" RENAME COLUMN "publicId" TO "path";
ALTER INDEX "Media_publicId_key" RENAME TO "Media_path_key";
