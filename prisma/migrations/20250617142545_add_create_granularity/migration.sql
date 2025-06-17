-- AlterTable
ALTER TABLE "clinic_schedules" ADD COLUMN     "createGranularity" INTEGER DEFAULT 5;

-- AlterTable
ALTER TABLE "schedule_templates" ADD COLUMN     "createGranularity" INTEGER DEFAULT 5;
