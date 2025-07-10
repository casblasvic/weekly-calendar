/*
  Warnings:

  - The values [CITA_CERRADA] on the enum `UsageEndedReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UsageEndedReason_new" AS ENUM ('MANUAL', 'AUTO_SHUTDOWN', 'APPOINTMENT_CLOSED', 'POWER_OFF_REANUDABLE');
ALTER TABLE "appointment_device_usage" ALTER COLUMN "endedReason" TYPE "UsageEndedReason_new" USING ("endedReason"::text::"UsageEndedReason_new");
ALTER TYPE "UsageEndedReason" RENAME TO "UsageEndedReason_old";
ALTER TYPE "UsageEndedReason_new" RENAME TO "UsageEndedReason";
DROP TYPE "UsageEndedReason_old";
COMMIT;
