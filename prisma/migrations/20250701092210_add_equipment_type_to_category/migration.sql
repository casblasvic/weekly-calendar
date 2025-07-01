-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "equipmentTypeId" TEXT;

-- CreateIndex
CREATE INDEX "categories_equipmentTypeId_idx" ON "categories"("equipmentTypeId");
