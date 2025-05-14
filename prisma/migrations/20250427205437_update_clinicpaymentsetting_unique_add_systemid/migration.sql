/*
  Warnings:

  - A unique constraint covering the columns `[systemId,clinicId,paymentMethodDefinitionId]` on the table `clinic_payment_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "clinic_payment_settings_clinicId_paymentMethodDefinitionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "clinic_payment_settings_systemId_clinicId_paymentMethodDefi_key" ON "clinic_payment_settings"("systemId", "clinicId", "paymentMethodDefinitionId");
