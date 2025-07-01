/*
  Warnings:

  - You are about to drop the column `location` on the `equipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "equipment" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "equipment_clinic_assignments" ADD COLUMN     "cabinId" TEXT;

-- CreateIndex
CREATE INDEX "equipment_clinic_assignments_cabinId_idx" ON "equipment_clinic_assignments"("cabinId");
