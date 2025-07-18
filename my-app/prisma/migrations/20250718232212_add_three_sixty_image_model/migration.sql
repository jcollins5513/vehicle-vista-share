-- CreateTable
CREATE TABLE "ThreeSixtyImage" (
    "stockNumber" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreeSixtyImage_pkey" PRIMARY KEY ("stockNumber")
);
