/*
  Warnings:

  - A unique constraint covering the columns `[name,systemId]` on the table `clinics` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "user_clinic_assignments" (
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_clinic_assignments_pkey" PRIMARY KEY ("userId","clinicId")
);

-- CreateIndex
CREATE INDEX "user_clinic_assignments_userId_idx" ON "user_clinic_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_clinic_assignments_clinicId_idx" ON "user_clinic_assignments"("clinicId");

-- CreateIndex
CREATE INDEX "appointments_equipmentId_idx" ON "appointments"("equipmentId");

-- CreateIndex
CREATE INDEX "appointments_originalAppointmentId_idx" ON "appointments"("originalAppointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "clinics_name_systemId_key" ON "clinics"("name", "systemId");

-- CreateIndex
CREATE INDEX "companies_systemId_idx" ON "companies"("systemId");

-- CreateIndex
CREATE INDEX "devices_deviceIdProvider_idx" ON "devices"("deviceIdProvider");

-- CreateIndex
CREATE INDEX "equipment_deviceId_idx" ON "equipment"("deviceId");

-- CreateIndex
CREATE INDEX "roles_systemId_idx" ON "roles"("systemId");

-- CreateIndex
CREATE INDEX "schedule_templates_systemId_idx" ON "schedule_templates"("systemId");

-- CreateIndex
CREATE INDEX "skills_systemId_idx" ON "skills"("systemId");

-- CreateIndex
CREATE INDEX "tickets_appointmentId_idx" ON "tickets"("appointmentId");

-- CreateIndex
CREATE INDEX "time_logs_userId_idx" ON "time_logs"("userId");

-- CreateIndex
CREATE INDEX "time_logs_systemId_idx" ON "time_logs"("systemId");

-- CreateIndex
CREATE INDEX "users_systemId_idx" ON "users"("systemId");

-- CreateIndex
CREATE INDEX "vat_types_systemId_idx" ON "vat_types"("systemId");
