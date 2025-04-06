/*
  Warnings:

  - You are about to drop the `clinic_schedules` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "prefix" TEXT;

-- DropTable
DROP TABLE "clinic_schedules";
