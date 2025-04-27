/*
  Warnings:

  - You are about to drop the `ClinicPaymentSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ClinicPaymentSetting";

-- CreateTable
CREATE TABLE "clinic_payment_settings" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "paymentMethodDefinitionId" TEXT NOT NULL,
    "receivingBankAccountId" TEXT,
    "isActiveInClinic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_payment_settings_systemId_idx" ON "clinic_payment_settings"("systemId");

-- CreateIndex
CREATE INDEX "clinic_payment_settings_clinicId_idx" ON "clinic_payment_settings"("clinicId");

-- CreateIndex
CREATE INDEX "clinic_payment_settings_paymentMethodDefinitionId_idx" ON "clinic_payment_settings"("paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "clinic_payment_settings_receivingBankAccountId_idx" ON "clinic_payment_settings"("receivingBankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_payment_settings_clinicId_paymentMethodDefinitionId_key" ON "clinic_payment_settings"("clinicId", "paymentMethodDefinitionId");
