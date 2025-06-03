-- CreateTable
CREATE TABLE "vat_type_account_mappings" (
    "id" TEXT NOT NULL,
    "vatTypeId" TEXT NOT NULL,
    "inputAccountId" TEXT,
    "outputAccountId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_type_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_legalEntityId_idx" ON "vat_type_account_mappings"("legalEntityId");

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_systemId_idx" ON "vat_type_account_mappings"("systemId");

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_inputAccountId_idx" ON "vat_type_account_mappings"("inputAccountId");

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_outputAccountId_idx" ON "vat_type_account_mappings"("outputAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_type_account_mappings_vatTypeId_legalEntityId_key" ON "vat_type_account_mappings"("vatTypeId", "legalEntityId");
