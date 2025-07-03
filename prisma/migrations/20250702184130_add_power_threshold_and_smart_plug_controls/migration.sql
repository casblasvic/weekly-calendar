-- AlterTable
ALTER TABLE "SmartPlugDevice" ADD COLUMN     "appointmentOnlyMode" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoShutdownEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "equipment" ADD COLUMN     "powerThreshold" DECIMAL(5,2) NOT NULL DEFAULT 10.0;
