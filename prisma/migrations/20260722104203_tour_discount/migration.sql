-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENT');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "discountEndsAt" TIMESTAMP(3),
ADD COLUMN     "discountStartsAt" TIMESTAMP(3),
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" DECIMAL(10,2);
