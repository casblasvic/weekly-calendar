/*
  Warnings:

  - You are about to drop the column `assignedAt` on the `user_clinic_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `clinicId` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `scheduleJson` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - The primary key for the `user_clinic_schedules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `clinicId` on the `user_clinic_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `user_clinic_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `user_clinic_schedules` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `user_clinic_assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignmentClinicId` to the `user_clinic_schedule_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignmentUserId` to the `user_clinic_schedule_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `exceptionScheduleJson` to the `user_clinic_schedule_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignmentClinicId` to the `user_clinic_schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignmentUserId` to the `user_clinic_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "user_clinic_schedule_exceptions_userId_clinicId_idx";

-- DropIndex
DROP INDEX "user_clinic_schedule_exceptions_userId_clinicId_startDate_idx";

-- DropIndex
DROP INDEX "user_clinic_schedules_clinicId_idx";

-- DropIndex
DROP INDEX "user_clinic_schedules_userId_clinicId_key";

-- DropIndex
DROP INDEX "user_clinic_schedules_userId_idx";

-- AlterTable
ALTER TABLE "user_clinic_assignments" DROP COLUMN "assignedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "user_clinic_schedule_exceptions" DROP COLUMN "clinicId",
DROP COLUMN "scheduleJson",
DROP COLUMN "userId",
ADD COLUMN     "assignmentClinicId" TEXT NOT NULL,
ADD COLUMN     "assignmentUserId" TEXT NOT NULL,
ADD COLUMN     "exceptionScheduleJson" JSONB NOT NULL,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "user_clinic_schedules" DROP CONSTRAINT "user_clinic_schedules_pkey",
DROP COLUMN "clinicId",
DROP COLUMN "id",
DROP COLUMN "userId",
ADD COLUMN     "assignmentClinicId" TEXT NOT NULL,
ADD COLUMN     "assignmentUserId" TEXT NOT NULL,
ADD CONSTRAINT "user_clinic_schedules_pkey" PRIMARY KEY ("assignmentUserId", "assignmentClinicId");

-- CreateIndex
CREATE INDEX "user_clinic_assignments_userId_idx" ON "user_clinic_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_assignmentUserId_assignment_idx" ON "user_clinic_schedule_exceptions"("assignmentUserId", "assignmentClinicId");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_startDate_endDate_idx" ON "user_clinic_schedule_exceptions"("startDate", "endDate");
