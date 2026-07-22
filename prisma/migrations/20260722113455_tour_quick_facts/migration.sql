-- CreateEnum
CREATE TYPE "PickupType" AS ENUM ('HOTEL_INCLUDED', 'AIRPORT_AVAILABLE', 'MEETING_POINT', 'NOT_INCLUDED');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FREE_24H', 'FREE_48H', 'FREE_72H', 'NON_REFUNDABLE');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "cancellationPolicy" "CancellationPolicy",
ADD COLUMN     "guideLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pickupType" "PickupType";
