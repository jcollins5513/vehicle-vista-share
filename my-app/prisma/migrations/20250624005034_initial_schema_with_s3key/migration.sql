-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('available', 'sold');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "features" TEXT[],
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "color" TEXT NOT NULL,
    "trim" TEXT,
    "engine" TEXT,
    "transmission" TEXT,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "facebookPostId" TEXT,
    "lastFacebookPostDate" TIMESTAMP(3),
    "carfaxHighlights" JSONB,
    "vehicleClass" TEXT DEFAULT 'SUV',
    "status" "VehicleStatus" NOT NULL DEFAULT 'available',
    "bodyStyle" TEXT,
    "lastMarketplacePostDate" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "vehicleId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_stockNumber_key" ON "Vehicle"("stockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Media_s3Key_key" ON "Media"("s3Key");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
