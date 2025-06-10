-- Add clinicId to ProductAccountMapping
ALTER TABLE "product_account_mappings" ADD COLUMN "clinicId" TEXT;

-- Add index for clinicId
CREATE INDEX "product_account_mappings_clinicId_idx" ON "product_account_mappings"("clinicId");

-- Add accountType to ProductAccountMapping
ALTER TABLE "product_account_mappings" ADD COLUMN "accountType" TEXT;

-- Update unique constraint to include clinicId
DROP INDEX IF EXISTS "product_account_mappings_productId_legalEntityId_systemId_key";
CREATE UNIQUE INDEX "product_account_mappings_productId_legalEntityId_systemId_clinicId_accountType_key" 
ON "product_account_mappings"("productId", "legalEntityId", "systemId", "clinicId", "accountType");

-- Add clinicId to PaymentMethodAccountMapping  
ALTER TABLE "payment_method_account_mappings" ADD COLUMN "clinicId" TEXT;

-- Add index for clinicId
CREATE INDEX "payment_method_account_mappings_clinicId_idx" ON "payment_method_account_mappings"("clinicId");

-- Update unique constraint to include clinicId
DROP INDEX IF EXISTS "payment_method_account_mappings_paymentMethodDefinitionId_legalEntityId_systemId_key";
CREATE UNIQUE INDEX "payment_method_account_mappings_paymentMethodDefinitionId_legalEntityId_systemId_clinicId_key"
ON "payment_method_account_mappings"("paymentMethodDefinitionId", "legalEntityId", "systemId", "clinicId");

-- Add clinicId to VATTypeAccountMapping
ALTER TABLE "vat_type_account_mappings" ADD COLUMN "clinicId" TEXT;

-- Add index for clinicId  
CREATE INDEX "vat_type_account_mappings_clinicId_idx" ON "vat_type_account_mappings"("clinicId");

-- Update unique constraint to include clinicId
DROP INDEX IF EXISTS "vat_type_account_mappings_vatTypeId_legalEntityId_systemId_key";
CREATE UNIQUE INDEX "vat_type_account_mappings_vatTypeId_legalEntityId_systemId_clinicId_key"
ON "vat_type_account_mappings"("vatTypeId", "legalEntityId", "systemId", "clinicId");
