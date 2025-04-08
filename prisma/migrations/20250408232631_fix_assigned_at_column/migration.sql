/*
  Warnings:

  - You are about to drop the column `createdAt` on the `user_clinic_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `user_clinic_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentClinicId` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentUserId` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `exceptionScheduleJson` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `user_clinic_schedule_exceptions` table. All the data in the column will be lost.
  - The primary key for the `user_clinic_schedules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignmentClinicId` on the `user_clinic_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `assignmentUserId` on the `user_clinic_schedules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,clinicId]` on the table `user_clinic_schedules` will be added. If there are existing duplicate values, this will fail.
  - Made the column `roleId` on table `user_clinic_assignments` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `clinicId` to the `user_clinic_schedule_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduleJson` to the `user_clinic_schedule_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `user_clinic_schedule_exceptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clinicId` to the `user_clinic_schedules` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `user_clinic_schedules` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `userId` to the `user_clinic_schedules` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "user_clinic_assignments_userId_idx";

-- DropIndex
DROP INDEX "user_clinic_schedule_exceptions_assignmentUserId_assignment_idx";

-- DropIndex
DROP INDEX "user_clinic_schedule_exceptions_startDate_endDate_idx";

-- AlterTable
ALTER TABLE "user_clinic_assignments" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "roleId" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_clinic_schedule_exceptions" DROP COLUMN "assignmentClinicId",
DROP COLUMN "assignmentUserId",
DROP COLUMN "exceptionScheduleJson",
DROP COLUMN "notes",
ADD COLUMN     "clinicId" TEXT NOT NULL,
ADD COLUMN     "scheduleJson" JSONB NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "user_clinic_schedules" DROP CONSTRAINT "user_clinic_schedules_pkey",
DROP COLUMN "assignmentClinicId",
DROP COLUMN "assignmentUserId",
ADD COLUMN     "clinicId" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD CONSTRAINT "user_clinic_schedules_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_userId_clinicId_startDate_idx" ON "user_clinic_schedule_exceptions"("userId", "clinicId", "startDate");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_userId_clinicId_idx" ON "user_clinic_schedule_exceptions"("userId", "clinicId");

-- CreateIndex
CREATE INDEX "user_clinic_schedules_userId_idx" ON "user_clinic_schedules"("userId");

-- CreateIndex
CREATE INDEX "user_clinic_schedules_clinicId_idx" ON "user_clinic_schedules"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "user_clinic_schedules_userId_clinicId_key" ON "user_clinic_schedules"("userId", "clinicId");
