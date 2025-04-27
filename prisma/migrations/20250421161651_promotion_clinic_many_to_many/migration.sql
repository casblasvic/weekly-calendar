/*
  Warnings:

  - The values [GLOBAL_SERVICE,GLOBAL_PRODUCT,GLOBAL_BONO,GLOBAL_PACKAGE,GLOBAL_CATEGORY,SPECIFIC_TARIFF] on the enum `PromotionTargetScope` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `clinicId` on the `promotions` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PromotionTargetScope_new" AS ENUM ('SPECIFIC_SERVICE', 'SPECIFIC_PRODUCT', 'SPECIFIC_BONO', 'SPECIFIC_PACKAGE', 'CATEGORY', 'TARIFF');
ALTER TABLE "promotions" ALTER COLUMN "targetScope" TYPE "PromotionTargetScope_new" USING ("targetScope"::text::"PromotionTargetScope_new");
ALTER TYPE "PromotionTargetScope" RENAME TO "PromotionTargetScope_old";
ALTER TYPE "PromotionTargetScope_new" RENAME TO "PromotionTargetScope";
DROP TYPE "PromotionTargetScope_old";
COMMIT;

-- DropIndex
DROP INDEX "promotions_clinicId_idx";

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "clinicId";

-- CreateTable
CREATE TABLE "promotion_clinic_scopes" (
    "promotionId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "promotion_clinic_scopes_pkey" PRIMARY KEY ("promotionId","clinicId")
);

-- CreateIndex
CREATE INDEX "promotion_clinic_scopes_promotionId_idx" ON "promotion_clinic_scopes"("promotionId");

-- CreateIndex
CREATE INDEX "promotion_clinic_scopes_clinicId_idx" ON "promotion_clinic_scopes"("clinicId");
