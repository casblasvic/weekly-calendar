-- DropIndex
DROP INDEX "user_clinic_assignments_userId_idx";

-- CreateTable
CREATE TABLE "user_clinic_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "scheduleJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_clinic_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_clinic_schedule_exceptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "scheduleJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_clinic_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_clinic_schedules_userId_idx" ON "user_clinic_schedules"("userId");

-- CreateIndex
CREATE INDEX "user_clinic_schedules_clinicId_idx" ON "user_clinic_schedules"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "user_clinic_schedules_userId_clinicId_key" ON "user_clinic_schedules"("userId", "clinicId");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_userId_clinicId_startDate_idx" ON "user_clinic_schedule_exceptions"("userId", "clinicId", "startDate");
