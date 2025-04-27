-- CreateEnum
CREATE TYPE "CompatibilityType" AS ENUM ('ALLOWED', 'EXCLUDED');

-- CreateTable
CREATE TABLE "promotion_compatibilities" (
    "promotionAId" TEXT NOT NULL,
    "promotionBId" TEXT NOT NULL,
    "type" "CompatibilityType" NOT NULL,

    CONSTRAINT "promotion_compatibilities_pkey" PRIMARY KEY ("promotionAId","promotionBId")
);

-- CreateIndex
CREATE INDEX "promotion_compatibilities_promotionAId_idx" ON "promotion_compatibilities"("promotionAId");

-- CreateIndex
CREATE INDEX "promotion_compatibilities_promotionBId_idx" ON "promotion_compatibilities"("promotionBId");
