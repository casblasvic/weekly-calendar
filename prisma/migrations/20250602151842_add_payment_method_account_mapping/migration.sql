-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'FISCAL_YEAR';

-- CreateTable
CREATE TABLE "payment_method_account_mappings" (
    "id" TEXT NOT NULL,
    "paymentMethodDefinitionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_method_account_mappings_legalEntityId_idx" ON "payment_method_account_mappings"("legalEntityId");

-- CreateIndex
CREATE INDEX "payment_method_account_mappings_systemId_idx" ON "payment_method_account_mappings"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_account_mappings_paymentMethodDefinitionId_l_key" ON "payment_method_account_mappings"("paymentMethodDefinitionId", "legalEntityId");
