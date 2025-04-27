/*
  Warnings:

  - You are about to drop the column `sessions` on the `bono_definitions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `bono_definitions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `quantity` to the `bono_definitions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bono_definitions" DROP COLUMN "sessions",
ADD COLUMN     "appearsInApp" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoAddToInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "colorCode" TEXT,
ADD COLUMN     "commissionType" TEXT,
ADD COLUMN     "commissionValue" DOUBLE PRECISION,
ADD COLUMN     "costPrice" DOUBLE PRECISION,
ADD COLUMN     "formattedDescription" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "termsAndConditions" TEXT,
ADD COLUMN     "vatTypeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bono_definitions_name_key" ON "bono_definitions"("name");

-- CreateIndex
CREATE INDEX "bono_definitions_productId_idx" ON "bono_definitions"("productId");

-- CreateIndex
CREATE INDEX "bono_definitions_vatTypeId_idx" ON "bono_definitions"("vatTypeId");
