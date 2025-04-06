/*
  Warnings:

  - A unique constraint covering the columns `[name,systemId]` on the table `equipment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "equipment_name_systemId_key" ON "equipment"("name", "systemId");

-- CreateIndex
CREATE INDEX "services_categoryId_idx" ON "services"("categoryId");
