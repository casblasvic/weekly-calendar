/*
  Warnings:

  - The `currentStatus` column on the `appointment_device_usage` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DeviceUsageStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'AUTO_SHUTDOWN');

-- AlterTable
ALTER TABLE "appointment_device_usage" DROP COLUMN "currentStatus",
ADD COLUMN     "currentStatus" "DeviceUsageStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "auto_shutdown_logs" (
    "id" TEXT NOT NULL,
    "appointmentDeviceUsageId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "equipmentClinicAssignmentId" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedMinutes" DOUBLE PRECISION NOT NULL,
    "actualMinutes" DOUBLE PRECISION NOT NULL,
    "powerThreshold" DOUBLE PRECISION,
    "shutdownSuccessful" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "autoShutdownEnabled" BOOLEAN NOT NULL,
    "deviceData" JSONB,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_shutdown_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auto_shutdown_logs_appointmentDeviceUsageId_idx" ON "auto_shutdown_logs"("appointmentDeviceUsageId");

-- CreateIndex
CREATE INDEX "auto_shutdown_logs_appointmentId_idx" ON "auto_shutdown_logs"("appointmentId");

-- CreateIndex
CREATE INDEX "auto_shutdown_logs_deviceId_idx" ON "auto_shutdown_logs"("deviceId");

-- CreateIndex
CREATE INDEX "auto_shutdown_logs_triggeredAt_idx" ON "auto_shutdown_logs"("triggeredAt");

-- CreateIndex
CREATE INDEX "auto_shutdown_logs_systemId_idx" ON "auto_shutdown_logs"("systemId");

-- CreateIndex
CREATE INDEX "appointment_device_usage_currentStatus_idx" ON "appointment_device_usage"("currentStatus");
