-- AlterTable
ALTER TABLE "appointment_device_usage" ADD COLUMN     "currentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "pauseIntervals" JSONB,
ADD COLUMN     "pausedAt" TIMESTAMPTZ(6),
ALTER COLUMN "equipmentId" DROP NOT NULL,
ALTER COLUMN "deviceId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "appointment_device_usage_currentStatus_idx" ON "appointment_device_usage"("currentStatus");
