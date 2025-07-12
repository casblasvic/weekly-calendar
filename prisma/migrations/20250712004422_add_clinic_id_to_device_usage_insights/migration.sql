/*
  Warnings:

  - Added the required column `clinicId` to the `smart_plug_device_usage_insights` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "smart_plug_device_usage_insights" ADD COLUMN     "clinicId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "smart_plug_device_usage_insights_clinicId_idx" ON "smart_plug_device_usage_insights"("clinicId");
