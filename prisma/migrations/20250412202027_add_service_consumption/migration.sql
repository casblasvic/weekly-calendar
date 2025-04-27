/*
  Warnings:

  - You are about to drop the column `itemType` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `numberOfItems` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `remainingItems` on the `bono_instances` table. All the data in the column will be lost.
  - You are about to drop the column `lowStockThreshold` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `optimalStock` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `unitOfMeasure` on the `products` table. All the data in the column will be lost.
  - You are about to alter the column `minStockThreshold` on the `products` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the `bono_consumptions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,systemId]` on the table `bono_definitions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `numberOfSessions` to the `bono_definitions` table without a default value. This is not possible if the table is not empty.
  - Made the column `serviceId` on table `bono_definitions` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `remainingSessions` to the `bono_instances` table without a default value. This is not possible if the table is not empty.
  - Made the column `order` on table `service_consumptions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "bono_definitions_itemType_idx";

-- DropIndex
DROP INDEX "bono_definitions_productId_idx";

-- DropIndex
DROP INDEX "products_sku_systemId_key";

-- DropIndex
DROP INDEX "services_code_key";

-- AlterTable
ALTER TABLE "bono_definitions" DROP COLUMN "itemType",
DROP COLUMN "numberOfItems",
DROP COLUMN "productId",
ADD COLUMN     "numberOfSessions" INTEGER NOT NULL,
ALTER COLUMN "serviceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "bono_instances" DROP COLUMN "remainingItems",
ADD COLUMN     "remainingSessions" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "lowStockThreshold",
DROP COLUMN "optimalStock",
DROP COLUMN "stock",
DROP COLUMN "unitOfMeasure",
ADD COLUMN     "currentStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isForSale" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isInternalUse" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "minStockThreshold" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "service_consumptions" ADD COLUMN     "notes" TEXT,
ALTER COLUMN "order" SET NOT NULL;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requiresMedicalSignOff" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "bono_consumptions";

-- CreateIndex
CREATE UNIQUE INDEX "bono_definitions_name_systemId_key" ON "bono_definitions"("name", "systemId");
