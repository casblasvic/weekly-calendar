/*
  Warnings:

  - You are about to drop the column `numberOfSessions` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `remainingSessions` on the `bono_instances` table. All the data in the column will be lost.
  - You are about to drop the column `currentStock` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isForSale` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isInternalUse` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `pointsAwarded` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `requiresMedicalSignOff` on the `services` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sku,systemId]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `services` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `itemType` to the `bono_definitions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfItems` to the `bono_definitions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingItems` to the `bono_instances` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bono_definitions_name_systemId_key";

-- AlterTable
ALTER TABLE "bono_definitions" DROP COLUMN "numberOfSessions",
ADD COLUMN     "itemType" TEXT NOT NULL,
ADD COLUMN     "numberOfItems" INTEGER NOT NULL,
ADD COLUMN     "productId" TEXT,
ALTER COLUMN "serviceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bono_instances" DROP COLUMN "remainingSessions",
ADD COLUMN     "remainingItems" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "currentStock",
DROP COLUMN "isForSale",
DROP COLUMN "isInternalUse",
ADD COLUMN     "lowStockThreshold" DOUBLE PRECISION,
ADD COLUMN     "optimalStock" DOUBLE PRECISION,
ADD COLUMN     "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unitOfMeasure" TEXT,
ALTER COLUMN "minStockThreshold" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "pointsAwarded",
DROP COLUMN "requiresMedicalSignOff";

-- CreateTable
CREATE TABLE "bono_consumptions" (
    "id" TEXT NOT NULL,
    "bonoInstanceId" TEXT NOT NULL,
    "consumptionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantityConsumed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "ticketItemId" TEXT,
    "appointmentId" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "bono_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_consumptions" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "order" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bono_consumptions_bonoInstanceId_idx" ON "bono_consumptions"("bonoInstanceId");

-- CreateIndex
CREATE INDEX "bono_consumptions_ticketItemId_idx" ON "bono_consumptions"("ticketItemId");

-- CreateIndex
CREATE INDEX "bono_consumptions_appointmentId_idx" ON "bono_consumptions"("appointmentId");

-- CreateIndex
CREATE INDEX "bono_consumptions_userId_idx" ON "bono_consumptions"("userId");

-- CreateIndex
CREATE INDEX "bono_consumptions_systemId_idx" ON "bono_consumptions"("systemId");

-- CreateIndex
CREATE INDEX "service_consumptions_serviceId_idx" ON "service_consumptions"("serviceId");

-- CreateIndex
CREATE INDEX "service_consumptions_productId_idx" ON "service_consumptions"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "service_consumptions_serviceId_productId_key" ON "service_consumptions"("serviceId", "productId");

-- CreateIndex
CREATE INDEX "bono_definitions_productId_idx" ON "bono_definitions"("productId");

-- CreateIndex
CREATE INDEX "bono_definitions_itemType_idx" ON "bono_definitions"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_systemId_key" ON "products"("sku", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");
