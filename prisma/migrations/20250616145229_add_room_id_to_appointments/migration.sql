-- AlterTable
ALTER TABLE "appointment_services" ALTER COLUMN "validatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "roomId" TEXT,
ALTER COLUMN "startTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "endTime" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deviceActivationTimestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deviceDeactivationTimestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "appointments_roomId_idx" ON "appointments"("roomId");
