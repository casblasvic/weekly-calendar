-- CreateTable
CREATE TABLE "clinic_schedules" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "slotDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_schedules_clinicId_key" ON "clinic_schedules"("clinicId");

-- CreateIndex
CREATE INDEX "clinic_schedules_clinicId_idx" ON "clinic_schedules"("clinicId");
