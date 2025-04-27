/*
  Warnings:

  - You are about to drop the `payment_method_definitions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "payment_method_definitions";

-- CreateTable
CREATE TABLE "PaymentMethodDefinition" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "details" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPaymentSetting" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "paymentMethodDefinitionId" TEXT NOT NULL,
    "receivingBankAccountId" TEXT,
    "isActiveInClinic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPaymentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentMethodDefinition_systemId_idx" ON "PaymentMethodDefinition"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodDefinition_name_systemId_key" ON "PaymentMethodDefinition"("name", "systemId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_systemId_idx" ON "ClinicPaymentSetting"("systemId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_clinicId_idx" ON "ClinicPaymentSetting"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_paymentMethodDefinitionId_idx" ON "ClinicPaymentSetting"("paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_receivingBankAccountId_idx" ON "ClinicPaymentSetting"("receivingBankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPaymentSetting_clinicId_paymentMethodDefinitionId_key" ON "ClinicPaymentSetting"("clinicId", "paymentMethodDefinitionId");
