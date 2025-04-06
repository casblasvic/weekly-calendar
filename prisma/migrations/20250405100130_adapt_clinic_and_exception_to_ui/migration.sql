-- DropIndex
DROP INDEX "schedule_exceptions_systemId_idx";

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "affectsStats" BOOLEAN DEFAULT true,
ADD COLUMN     "appearsInApp" BOOLEAN DEFAULT true,
ADD COLUMN     "blockPersonalData" BOOLEAN DEFAULT false,
ADD COLUMN     "blockSignArea" BOOLEAN DEFAULT false,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "cif" TEXT,
ADD COLUMN     "closeTime" TEXT,
ADD COLUMN     "commercialName" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "delayedPayments" BOOLEAN DEFAULT false,
ADD COLUMN     "initialCash" DOUBLE PRECISION,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "openTime" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "professionalSkills" BOOLEAN DEFAULT false,
ADD COLUMN     "scheduleControl" BOOLEAN DEFAULT false,
ADD COLUMN     "scheduleJson" JSONB,
ADD COLUMN     "slotDuration" INTEGER,
ADD COLUMN     "tariffId" TEXT,
ADD COLUMN     "ticketSize" TEXT;

-- AlterTable
ALTER TABLE "schedule_exceptions" ADD COLUMN     "overrideScheduleJson" JSONB;

-- CreateIndex
CREATE INDEX "clinics_tariffId_idx" ON "clinics"("tariffId");
