-- AlterTable
ALTER TABLE "product_settings" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "service_consumptions" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "service_settings" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE INDEX "product_settings_systemId_idx" ON "product_settings"("systemId");

-- CreateIndex
CREATE INDEX "product_settings_clinicId_idx" ON "product_settings"("clinicId");

-- CreateIndex
CREATE INDEX "service_consumptions_systemId_idx" ON "service_consumptions"("systemId");

-- CreateIndex
CREATE INDEX "service_consumptions_clinicId_idx" ON "service_consumptions"("clinicId");

-- CreateIndex
CREATE INDEX "service_settings_systemId_idx" ON "service_settings"("systemId");

-- CreateIndex
CREATE INDEX "service_settings_clinicId_idx" ON "service_settings"("clinicId");
