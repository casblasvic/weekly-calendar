/*
  Warnings:

  - The values [FREE_ITEM,BUY_X_GET_Y] on the enum `PromotionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentUses` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `maxUses` on the `promotions` table. All the data in the column will be lost.
  - You are about to drop the column `usesPerClient` on the `promotions` table. All the data in the column will be lost.
  - Added the required column `targetScope` to the `promotions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PromotionTargetScope" AS ENUM ('GLOBAL_SERVICE', 'GLOBAL_PRODUCT', 'GLOBAL_BONO', 'GLOBAL_PACKAGE', 'GLOBAL_CATEGORY', 'SPECIFIC_TARIFF');

-- AlterEnum
BEGIN;
CREATE TYPE "PromotionType_new" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT', 'BUY_X_GET_Y_SERVICE', 'BUY_X_GET_Y_PRODUCT', 'POINTS_MULTIPLIER', 'FREE_SHIPPING');
ALTER TABLE "promotions" ALTER COLUMN "type" TYPE "PromotionType_new" USING ("type"::text::"PromotionType_new");
ALTER TYPE "PromotionType" RENAME TO "PromotionType_old";
ALTER TYPE "PromotionType_new" RENAME TO "PromotionType";
DROP TYPE "PromotionType_old";
COMMIT;

-- AlterTable
ALTER TABLE "promotions" DROP COLUMN "currentUses",
DROP COLUMN "maxUses",
DROP COLUMN "usesPerClient",
ADD COLUMN     "bogoBuyQuantity" INTEGER,
ADD COLUMN     "bogoGetProductId" TEXT,
ADD COLUMN     "bogoGetQuantity" INTEGER,
ADD COLUMN     "bogoGetServiceId" TEXT,
ADD COLUMN     "bogoGetValue" DOUBLE PRECISION,
ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "maxTotalUses" INTEGER,
ADD COLUMN     "maxUsesPerClient" INTEGER,
ADD COLUMN     "targetBonoDefinitionId" TEXT,
ADD COLUMN     "targetCategoryId" TEXT,
ADD COLUMN     "targetPackageDefinitionId" TEXT,
ADD COLUMN     "targetProductId" TEXT,
ADD COLUMN     "targetScope" "PromotionTargetScope" NOT NULL,
ADD COLUMN     "targetServiceId" TEXT,
ADD COLUMN     "targetTariffId" TEXT,
ALTER COLUMN "startDate" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "promotions_type_idx" ON "promotions"("type");

-- CreateIndex
CREATE INDEX "promotions_targetScope_idx" ON "promotions"("targetScope");

-- CreateIndex
CREATE INDEX "promotions_targetServiceId_idx" ON "promotions"("targetServiceId");

-- CreateIndex
CREATE INDEX "promotions_targetProductId_idx" ON "promotions"("targetProductId");

-- CreateIndex
CREATE INDEX "promotions_targetBonoDefinitionId_idx" ON "promotions"("targetBonoDefinitionId");

-- CreateIndex
CREATE INDEX "promotions_targetPackageDefinitionId_idx" ON "promotions"("targetPackageDefinitionId");

-- CreateIndex
CREATE INDEX "promotions_targetCategoryId_idx" ON "promotions"("targetCategoryId");

-- CreateIndex
CREATE INDEX "promotions_targetTariffId_idx" ON "promotions"("targetTariffId");

-- CreateIndex
CREATE INDEX "promotions_bogoGetServiceId_idx" ON "promotions"("bogoGetServiceId");

-- CreateIndex
CREATE INDEX "promotions_bogoGetProductId_idx" ON "promotions"("bogoGetProductId");

-- CreateIndex
CREATE INDEX "promotions_clinicId_idx" ON "promotions"("clinicId");
