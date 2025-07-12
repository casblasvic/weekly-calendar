-- AlterTable
ALTER TABLE "appointment_device_usage" ADD COLUMN     "clinicId" TEXT;

-- AlterTable
ALTER TABLE "appointment_services" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "ticket_items" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE INDEX "appointment_device_usage_clinicId_idx" ON "appointment_device_usage"("clinicId");

-- CreateIndex
CREATE INDEX "appointment_services_systemId_idx" ON "appointment_services"("systemId");

-- CreateIndex
CREATE INDEX "appointment_services_clinicId_idx" ON "appointment_services"("clinicId");

-- CreateIndex
CREATE INDEX "invoice_items_systemId_idx" ON "invoice_items"("systemId");

-- CreateIndex
CREATE INDEX "invoice_items_clinicId_idx" ON "invoice_items"("clinicId");

-- CreateIndex
CREATE INDEX "ticket_items_systemId_idx" ON "ticket_items"("systemId");

-- CreateIndex
CREATE INDEX "ticket_items_clinicId_idx" ON "ticket_items"("clinicId");
