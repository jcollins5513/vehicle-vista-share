-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "mileage" INTEGER NOT NULL,
    "exteriorColor" TEXT,
    "vin" TEXT,
    "trim" TEXT,
    "engine" TEXT,
    "transmission" TEXT,
    "bodyStyle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "photos" TEXT[],

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_stockNumber_key" ON "vehicles"("stockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");
