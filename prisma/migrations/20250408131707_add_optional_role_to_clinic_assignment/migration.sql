-- AlterTable
ALTER TABLE "user_clinic_assignments" ADD COLUMN     "roleId" TEXT;

-- CreateIndex
CREATE INDEX "client_relations_clientAId_idx" ON "client_relations"("clientAId");

-- CreateIndex
CREATE INDEX "employment_contracts_systemId_idx" ON "employment_contracts"("systemId");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_userId_idx" ON "loyalty_ledgers"("userId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_vatTypeId_idx" ON "products"("vatTypeId");

-- CreateIndex
CREATE INDEX "tariffs_defaultVatTypeId_idx" ON "tariffs"("defaultVatTypeId");

-- CreateIndex
CREATE INDEX "ticket_items_originalVatTypeId_idx" ON "ticket_items"("originalVatTypeId");

-- CreateIndex
CREATE INDEX "user_clinic_assignments_roleId_idx" ON "user_clinic_assignments"("roleId");

-- CreateIndex
CREATE INDEX "user_clinic_schedule_exceptions_userId_clinicId_idx" ON "user_clinic_schedule_exceptions"("userId", "clinicId");

-- CreateIndex
CREATE INDEX "user_skills_userId_idx" ON "user_skills"("userId");

-- CreateIndex
CREATE INDEX "user_skills_skillId_idx" ON "user_skills"("skillId");
