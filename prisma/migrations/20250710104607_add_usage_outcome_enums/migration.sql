-- CreateEnum
CREATE TYPE "UsageEndedReason" AS ENUM ('MANUAL', 'AUTO_SHUTDOWN', 'CITA_CERRADA', 'POWER_OFF_REANUDABLE');

-- CreateEnum
CREATE TYPE "UsageOutcome" AS ENUM ('EARLY', 'ON_TIME', 'EXTENDED');

-- AlterTable
ALTER TABLE "appointment_device_usage" ADD COLUMN     "endedReason" "UsageEndedReason",
ADD COLUMN     "usageOutcome" "UsageOutcome";
