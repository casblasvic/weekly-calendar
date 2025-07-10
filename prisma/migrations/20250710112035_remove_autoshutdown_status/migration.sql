/*
  Warnings:

  - The values [AUTO_SHUTDOWN] on the enum `DeviceUsageStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeviceUsageStatus_new" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
ALTER TABLE "appointment_device_usage" ALTER COLUMN "currentStatus" DROP DEFAULT;
ALTER TABLE "appointment_device_usage" ALTER COLUMN "currentStatus" TYPE "DeviceUsageStatus_new" USING ("currentStatus"::text::"DeviceUsageStatus_new");
ALTER TYPE "DeviceUsageStatus" RENAME TO "DeviceUsageStatus_old";
ALTER TYPE "DeviceUsageStatus_new" RENAME TO "DeviceUsageStatus";
DROP TYPE "DeviceUsageStatus_old";
ALTER TABLE "appointment_device_usage" ALTER COLUMN "currentStatus" SET DEFAULT 'ACTIVE';
COMMIT;
