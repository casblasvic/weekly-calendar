/*
  Warnings:

  - You are about to drop the column `scheduleJson` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the `schedule_exceptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_schedules` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `schedule_template_blocks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "scheduleJson",
ADD COLUMN     "linkedScheduleTemplateId" TEXT;

-- AlterTable
ALTER TABLE "schedule_template_blocks" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "schedule_templates" ADD COLUMN     "closeTime" TEXT,
ADD COLUMN     "openTime" TEXT;

-- DropTable
DROP TABLE "schedule_exceptions";

-- DropTable
DROP TABLE "user_schedules";

-- CreateTable
CREATE TABLE "clinic_schedule_blocks" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_schedule_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_schedule_blocks_clinicId_idx" ON "clinic_schedule_blocks"("clinicId");

-- CreateIndex
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- CreateIndex
CREATE INDEX "clinics_linkedScheduleTemplateId_idx" ON "clinics"("linkedScheduleTemplateId");
