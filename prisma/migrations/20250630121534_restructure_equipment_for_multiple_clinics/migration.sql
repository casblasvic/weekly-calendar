/*
  Warnings:

  - You are about to drop the column `clinicId` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `deviceId` on the `equipment` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `equipment` table. All the data in the column will be lost.
  - Added the required column `equipmentClinicAssignmentId` to the `spare_part_installations` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "equipment_clinicId_idx";

-- DropIndex
DROP INDEX "equipment_deviceId_idx";

-- DropIndex
DROP INDEX "equipment_deviceId_key";

-- DropIndex
DROP INDEX "equipment_serialNumber_key";

-- AlterTable
ALTER TABLE "appointment_device_usage" ADD COLUMN     "equipmentClinicAssignmentId" TEXT;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "equipmentClinicAssignmentId" TEXT;

-- AlterTable
ALTER TABLE "equipment" DROP COLUMN "clinicId",
DROP COLUMN "deviceId",
DROP COLUMN "serialNumber";

-- AlterTable
ALTER TABLE "spare_part_installations" ADD COLUMN     "equipmentClinicAssignmentId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "equipment_clinic_assignments" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_clinic_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_clinic_assignments_serialNumber_key" ON "equipment_clinic_assignments"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_clinic_assignments_deviceId_key" ON "equipment_clinic_assignments"("deviceId");

-- CreateIndex
CREATE INDEX "equipment_clinic_assignments_equipmentId_idx" ON "equipment_clinic_assignments"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_clinic_assignments_clinicId_idx" ON "equipment_clinic_assignments"("clinicId");

-- CreateIndex
CREATE INDEX "equipment_clinic_assignments_serialNumber_idx" ON "equipment_clinic_assignments"("serialNumber");

-- CreateIndex
CREATE INDEX "equipment_clinic_assignments_deviceId_idx" ON "equipment_clinic_assignments"("deviceId");

-- CreateIndex
CREATE INDEX "equipment_clinic_assignments_systemId_idx" ON "equipment_clinic_assignments"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_clinic_assignments_equipmentId_clinicId_serialNum_key" ON "equipment_clinic_assignments"("equipmentId", "clinicId", "serialNumber");

-- CreateIndex
CREATE INDEX "appointment_device_usage_equipmentClinicAssignmentId_idx" ON "appointment_device_usage"("equipmentClinicAssignmentId");

-- CreateIndex
CREATE INDEX "appointments_equipmentClinicAssignmentId_idx" ON "appointments"("equipmentClinicAssignmentId");

-- CreateIndex
CREATE INDEX "spare_part_installations_equipmentClinicAssignmentId_idx" ON "spare_part_installations"("equipmentClinicAssignmentId");
