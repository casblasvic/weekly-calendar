-- CreateTable
CREATE TABLE "vat_type_account_mappings" (
    "id" TEXT NOT NULL,
    "vatTypeId" TEXT NOT NULL,
    "clinicId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "inputAccountId" TEXT,
    "outputAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_type_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_clinicId_idx" ON "vat_type_account_mappings"("clinicId");

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_legalEntityId_idx" ON "vat_type_account_mappings"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_type_account_mappings_vatTypeId_clinicId_legalEntityId_key" ON "vat_type_account_mappings"("vatTypeId", "clinicId", "legalEntityId");

-- AddForeignKey
ALTER TABLE "vat_type_account_mappings" ADD CONSTRAINT "vat_type_account_mappings_vatTypeId_fkey" FOREIGN KEY ("vatTypeId") REFERENCES "vat_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_type_account_mappings" ADD CONSTRAINT "vat_type_account_mappings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_type_account_mappings" ADD CONSTRAINT "vat_type_account_mappings_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "legal_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_type_account_mappings" ADD CONSTRAINT "vat_type_account_mappings_inputAccountId_fkey" FOREIGN KEY ("inputAccountId") REFERENCES "chart_of_account_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_type_account_mappings" ADD CONSTRAINT "vat_type_account_mappings_outputAccountId_fkey" FOREIGN KEY ("outputAccountId") REFERENCES "chart_of_account_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
