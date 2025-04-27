/*
  Warnings:

  - The primary key for the `promotion_compatibilities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `promotionAId` on the `promotion_compatibilities` table. All the data in the column will be lost.
  - You are about to drop the column `promotionBId` on the `promotion_compatibilities` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `promotion_compatibilities` table. All the data in the column will be lost.
  - Added the required column `compatiblePromotionId` to the `promotion_compatibilities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `promotionId` to the `promotion_compatibilities` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PromotionAccumulationMode" AS ENUM ('EXCLUSIVE', 'ALL', 'SPECIFIC');

-- DropIndex
DROP INDEX "promotion_compatibilities_promotionAId_idx";

-- DropIndex
DROP INDEX "promotion_compatibilities_promotionBId_idx";

-- AlterTable
ALTER TABLE "promotion_compatibilities" DROP CONSTRAINT "promotion_compatibilities_pkey",
DROP COLUMN "promotionAId",
DROP COLUMN "promotionBId",
DROP COLUMN "type",
ADD COLUMN     "compatiblePromotionId" TEXT NOT NULL,
ADD COLUMN     "promotionId" TEXT NOT NULL,
ADD CONSTRAINT "promotion_compatibilities_pkey" PRIMARY KEY ("promotionId", "compatiblePromotionId");

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "accumulationMode" "PromotionAccumulationMode" NOT NULL DEFAULT 'EXCLUSIVE';

-- DropEnum
DROP TYPE "CompatibilityType";

-- CreateIndex
CREATE INDEX "promotion_compatibilities_compatiblePromotionId_idx" ON "promotion_compatibilities"("compatiblePromotionId");
