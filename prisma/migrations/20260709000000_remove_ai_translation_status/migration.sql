-- Remove the AI-assisted translation workflow.
-- Translations are now entered fully manually per locale, so the per-locale
-- generation status (`status`, `lastTranslatedAt`) and the `TranslationStatus`
-- enum (which included the `AI_GENERATED`/`HUMAN_REVIEWED` states) are dropped.

-- AlterTable
ALTER TABLE "TourTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- AlterTable
ALTER TABLE "CategoryTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- AlterTable
ALTER TABLE "DestinationTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- AlterTable
ALTER TABLE "TestimonialTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- AlterTable
ALTER TABLE "FaqTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- AlterTable
ALTER TABLE "HomepageSectionTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- AlterTable
ALTER TABLE "HeroBannerTranslation" DROP COLUMN "status",
DROP COLUMN "lastTranslatedAt";

-- DropEnum
DROP TYPE "TranslationStatus";
