/*
  Warnings:

  - You are about to drop the column `appearsInApp` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `autoAddToInvoice` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `commissionType` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `commissionValue` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `pointsAwarded` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `package_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `pointsAwarded` on the `package_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `currentStock` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isForSale` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isInternalUse` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `minStockThreshold` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `pointsAwarded` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `pointsAwarded` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `requiresMedicalSignOff` on the `services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bono_definitions" DROP COLUMN "appearsInApp",
DROP COLUMN "autoAddToInvoice",
DROP COLUMN "commissionType",
DROP COLUMN "commissionValue",
DROP COLUMN "isActive",
DROP COLUMN "pointsAwarded";

-- AlterTable
ALTER TABLE "package_definitions" DROP COLUMN "isActive",
DROP COLUMN "pointsAwarded";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "currentStock",
DROP COLUMN "isActive",
DROP COLUMN "isForSale",
DROP COLUMN "isInternalUse",
DROP COLUMN "minStockThreshold",
DROP COLUMN "pointsAwarded";

-- AlterTable
ALTER TABLE "services" DROP COLUMN "isActive",
DROP COLUMN "pointsAwarded",
DROP COLUMN "requiresMedicalSignOff";

-- CreateTable
CREATE TABLE "service_settings" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "requiresMedicalSignOff" BOOLEAN NOT NULL DEFAULT false,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "commissionType" TEXT,
    "commissionValue" DOUBLE PRECISION,
    "requiresParams" BOOLEAN NOT NULL DEFAULT false,
    "appearsInApp" BOOLEAN NOT NULL DEFAULT true,
    "autoAddToInvoice" BOOLEAN NOT NULL DEFAULT false,
    "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minTimeBeforeBooking" INTEGER,
    "maxTimeBeforeBooking" INTEGER,
    "cancellationPolicy" TEXT,
    "preparationTimeMinutes" INTEGER,
    "cleanupTimeMinutes" INTEGER,
    "internalNotes" TEXT,

    CONSTRAINT "service_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_equipment_requirements" (
    "serviceId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "service_equipment_requirements_pkey" PRIMARY KEY ("serviceId","equipmentId")
);

-- CreateTable
CREATE TABLE "service_skill_requirements" (
    "serviceId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "service_skill_requirements_pkey" PRIMARY KEY ("serviceId","skillId")
);

-- CreateTable
CREATE TABLE "product_settings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStockThreshold" INTEGER,
    "isForSale" BOOLEAN NOT NULL DEFAULT true,
    "isInternalUse" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bono_definition_settings" (
    "id" TEXT NOT NULL,
    "bonoDefinitionId" TEXT NOT NULL,
    "validityDays" INTEGER,
    "costPrice" DOUBLE PRECISION,
    "commissionType" TEXT,
    "commissionValue" DOUBLE PRECISION,
    "appearsInApp" BOOLEAN NOT NULL DEFAULT true,
    "autoAddToInvoice" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bono_definition_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_definition_settings" (
    "id" TEXT NOT NULL,
    "packageDefinitionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "package_definition_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_settings_serviceId_key" ON "service_settings"("serviceId");

-- CreateIndex
CREATE INDEX "service_equipment_requirements_equipmentId_idx" ON "service_equipment_requirements"("equipmentId");

-- CreateIndex
CREATE INDEX "service_skill_requirements_skillId_idx" ON "service_skill_requirements"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "product_settings_productId_key" ON "product_settings"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "bono_definition_settings_bonoDefinitionId_key" ON "bono_definition_settings"("bonoDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "package_definition_settings_packageDefinitionId_key" ON "package_definition_settings"("packageDefinitionId");
