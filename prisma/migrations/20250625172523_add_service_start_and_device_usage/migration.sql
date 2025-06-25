-- AlterEnum
ALTER TYPE "AppointmentServiceStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "appointment_services" ADD COLUMN     "serviceStartedAt" TIMESTAMPTZ(6),
ADD COLUMN     "serviceStartedByUserId" TEXT;

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "appointment_device_usage" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "appointmentServiceId" TEXT,
    "equipmentId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "endedAt" TIMESTAMPTZ(6),
    "estimatedMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER,
    "energyConsumption" DOUBLE PRECISION,
    "deviceData" JSONB,
    "startedByUserId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "appointment_device_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_device_usage_appointmentId_idx" ON "appointment_device_usage"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_device_usage_startedAt_idx" ON "appointment_device_usage"("startedAt");

-- CreateIndex
CREATE INDEX "appointment_device_usage_deviceId_idx" ON "appointment_device_usage"("deviceId");

-- CreateIndex
CREATE INDEX "appointment_device_usage_equipmentId_idx" ON "appointment_device_usage"("equipmentId");

-- CreateIndex
CREATE INDEX "appointment_device_usage_systemId_idx" ON "appointment_device_usage"("systemId");

-- CreateIndex
CREATE INDEX "appointment_device_usage_appointmentServiceId_idx" ON "appointment_device_usage"("appointmentServiceId");

-- CreateIndex
CREATE INDEX "appointment_device_usage_startedByUserId_idx" ON "appointment_device_usage"("startedByUserId");

-- CreateIndex
CREATE INDEX "appointment_services_serviceStartedAt_idx" ON "appointment_services"("serviceStartedAt");

-- CreateIndex
CREATE INDEX "appointment_services_serviceStartedByUserId_idx" ON "appointment_services"("serviceStartedByUserId");
