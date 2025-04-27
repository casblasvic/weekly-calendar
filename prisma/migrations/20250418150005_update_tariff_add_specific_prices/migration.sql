/*
  Warnings:

  - You are about to drop the column `defaultVatTypeId` on the `tariffs` table. All the data in the column will be lost.
  - Added the required column `currencyCode` to the `tariffs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vatTypeId` to the `tariffs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tariffs_defaultVatTypeId_idx";

-- AlterTable
ALTER TABLE "tariffs" DROP COLUMN "defaultVatTypeId",
ADD COLUMN     "currencyCode" TEXT NOT NULL,
ADD COLUMN     "vatTypeId" TEXT NOT NULL,
ALTER COLUMN "validFrom" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "validUntil" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tariff_bono_prices" (
    "tariffId" TEXT NOT NULL,
    "bonoDefinitionId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vatTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tariff_bono_prices_pkey" PRIMARY KEY ("tariffId","bonoDefinitionId")
);

-- CreateTable
CREATE TABLE "tariff_package_prices" (
    "tariffId" TEXT NOT NULL,
    "packageDefinitionId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vatTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tariff_package_prices_pkey" PRIMARY KEY ("tariffId","packageDefinitionId")
);

-- CreateIndex
CREATE INDEX "tariff_bono_prices_bonoDefinitionId_idx" ON "tariff_bono_prices"("bonoDefinitionId");

-- CreateIndex
CREATE INDEX "tariff_bono_prices_vatTypeId_idx" ON "tariff_bono_prices"("vatTypeId");

-- CreateIndex
CREATE INDEX "tariff_package_prices_packageDefinitionId_idx" ON "tariff_package_prices"("packageDefinitionId");

-- CreateIndex
CREATE INDEX "tariff_package_prices_vatTypeId_idx" ON "tariff_package_prices"("vatTypeId");

-- CreateIndex
CREATE INDEX "tariffs_vatTypeId_idx" ON "tariffs"("vatTypeId");
