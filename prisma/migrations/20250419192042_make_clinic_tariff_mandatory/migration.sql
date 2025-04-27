/*
  Warnings:

  - Made the column `tariffId` on table `clinics` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "clinics" ALTER COLUMN "tariffId" SET NOT NULL;
