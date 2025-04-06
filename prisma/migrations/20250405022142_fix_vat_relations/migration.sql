/*
  Warnings:

  - You are about to drop the column `vatTypeId` on the `ticket_items` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `vat_types` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `vat_types` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `vat_types` table. All the data in the column will be lost.
  - You are about to drop the column `ratePercent` on the `vat_types` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,systemId]` on the table `vat_types` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rate` to the `vat_types` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ticket_items_vatTypeId_idx";

-- DropIndex
DROP INDEX "vat_types_name_systemId_countryCode_key";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vatTypeId" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "vatTypeId" TEXT;

-- AlterTable
ALTER TABLE "tariffs" ADD COLUMN     "defaultVatTypeId" TEXT;

-- AlterTable
ALTER TABLE "ticket_items" DROP COLUMN "vatTypeId",
ADD COLUMN     "originalVatTypeId" TEXT,
ADD COLUMN     "vatRateId" TEXT;

-- AlterTable
ALTER TABLE "vat_types" DROP COLUMN "countryCode",
DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "ratePercent",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rate" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE INDEX "services_vatTypeId_idx" ON "services"("vatTypeId");

-- CreateIndex
CREATE INDEX "ticket_items_vatRateId_idx" ON "ticket_items"("vatRateId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_types_name_systemId_key" ON "vat_types"("name", "systemId");
