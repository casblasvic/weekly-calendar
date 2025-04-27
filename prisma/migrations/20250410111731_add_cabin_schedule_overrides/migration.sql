-- CreateTable
CREATE TABLE "cabin_schedule_overrides" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "cabinIds" TEXT[],
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "description" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "days_of_week" INTEGER[],
    "recurrence_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabin_schedule_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cabin_schedule_overrides_clinicId_start_date_end_date_idx" ON "cabin_schedule_overrides"("clinicId", "start_date", "end_date");
