-- AlterTable
ALTER TABLE "bono_definition_settings" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "cabin_schedule_overrides" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "clinic_schedule_blocks" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "clinic_schedules" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "package_definition_settings" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "package_items" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "schedule_template_blocks" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "user_clinic_schedule_exceptions" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "user_clinic_schedules" ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE INDEX "bono_definition_settings_systemId_idx" ON "bono_definition_settings"("systemId");

-- CreateIndex
CREATE INDEX "bono_definition_settings_clinicId_idx" ON "bono_definition_settings"("clinicId");

-- CreateIndex
CREATE INDEX "cabin_schedule_overrides_systemId_idx" ON "cabin_schedule_overrides"("systemId");

-- CreateIndex
CREATE INDEX "clinic_schedule_blocks_systemId_idx" ON "clinic_schedule_blocks"("systemId");

-- CreateIndex
CREATE INDEX "clinic_schedules_systemId_idx" ON "clinic_schedules"("systemId");

-- CreateIndex
CREATE INDEX "package_definition_settings_systemId_idx" ON "package_definition_settings"("systemId");

-- CreateIndex
CREATE INDEX "package_definition_settings_clinicId_idx" ON "package_definition_settings"("clinicId");

-- CreateIndex
CREATE INDEX "package_items_systemId_idx" ON "package_items"("systemId");

-- CreateIndex
CREATE INDEX "package_items_clinicId_idx" ON "package_items"("clinicId");

-- CreateIndex
CREATE INDEX "schedule_template_blocks_systemId_idx" ON "schedule_template_blocks"("systemId");

-- CreateIndex
CREATE INDEX "schedule_template_blocks_clinicId_idx" ON "schedule_template_blocks"("clinicId");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_systemId_idx" ON "user_clinic_schedule_exceptions"("systemId");

-- CreateIndex
CREATE INDEX "user_clinic_schedules_systemId_idx" ON "user_clinic_schedules"("systemId");
