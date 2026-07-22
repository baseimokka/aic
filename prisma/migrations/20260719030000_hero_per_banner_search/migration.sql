-- AlterTable
ALTER TABLE "HeroBanner" ADD COLUMN     "showSearch" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "heroSearchEnabled";
