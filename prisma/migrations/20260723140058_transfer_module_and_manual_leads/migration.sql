-- CreateEnum
CREATE TYPE "TransferRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TransferVehicle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRoute" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "vehicleId" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "notes" TEXT,
    "quotedPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "TransferRequestStatus" NOT NULL DEFAULT 'NEW',
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferVehicle_active_idx" ON "TransferVehicle"("active");

-- CreateIndex
CREATE INDEX "TransferLocation_active_idx" ON "TransferLocation"("active");

-- CreateIndex
CREATE INDEX "TransferRoute_fromLocationId_idx" ON "TransferRoute"("fromLocationId");

-- CreateIndex
CREATE INDEX "TransferRoute_toLocationId_idx" ON "TransferRoute"("toLocationId");

-- CreateIndex
CREATE INDEX "TransferRoute_vehicleId_idx" ON "TransferRoute"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRoute_fromLocationId_toLocationId_vehicleId_key" ON "TransferRoute"("fromLocationId", "toLocationId", "vehicleId");

-- CreateIndex
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");

-- CreateIndex
CREATE INDEX "TransferRequest_pickupDate_idx" ON "TransferRequest"("pickupDate");

-- CreateIndex
CREATE INDEX "TransferRequest_createdAt_idx" ON "TransferRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "TransferRoute" ADD CONSTRAINT "TransferRoute_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRoute" ADD CONSTRAINT "TransferRoute_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRoute" ADD CONSTRAINT "TransferRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransferVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "TransferVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
