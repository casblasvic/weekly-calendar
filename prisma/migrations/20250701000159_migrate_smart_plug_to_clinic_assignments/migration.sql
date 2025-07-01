/*
  Warnings:

  - You are about to drop the column `equipmentId` on the `SmartPlugDevice` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[equipmentClinicAssignmentId]` on the table `SmartPlugDevice` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SmartPlugDevice_equipmentId_key";

-- AlterTable
ALTER TABLE "SmartPlugDevice" DROP COLUMN "equipmentId",
ADD COLUMN     "equipmentClinicAssignmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SmartPlugDevice_equipmentClinicAssignmentId_key" ON "SmartPlugDevice"("equipmentClinicAssignmentId");

-- CreateIndex
CREATE INDEX "SmartPlugDevice_equipmentClinicAssignmentId_idx" ON "SmartPlugDevice"("equipmentClinicAssignmentId");
