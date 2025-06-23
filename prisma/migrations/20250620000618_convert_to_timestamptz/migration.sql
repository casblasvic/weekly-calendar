-- AlterTable
ALTER TABLE "appointment_services" ALTER COLUMN "validatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deviceActivationTimestamp" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "deviceDeactivationTimestamp" SET DATA TYPE TIMESTAMPTZ;
