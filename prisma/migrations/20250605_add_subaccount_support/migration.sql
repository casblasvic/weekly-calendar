-- Add subaccount support to account mappings

-- Add subaccountPattern to all mapping tables
ALTER TABLE "category_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "product_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "service_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "payment_method_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "vat_type_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "expense_type_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "cash_session_account_mappings" ADD COLUMN "subaccountPattern" TEXT;
ALTER TABLE "discount_type_account_mappings" ADD COLUMN "subaccountPattern" TEXT;

-- Add analyticalDimensions column (JSON) to store dimension configuration
ALTER TABLE "category_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "product_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "service_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "payment_method_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "vat_type_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "expense_type_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "cash_session_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;
ALTER TABLE "discount_type_account_mappings" ADD COLUMN "analyticalDimensions" JSONB;

-- Create table for account mapping templates by country
CREATE TABLE "account_mapping_templates" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "baseAccount" TEXT NOT NULL,
    "subaccountPattern" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_mapping_templates_pkey" PRIMARY KEY ("id")
);

-- Create index for quick lookups
CREATE INDEX "account_mapping_templates_countryCode_idx" ON "account_mapping_templates"("countryCode");
CREATE INDEX "account_mapping_templates_operationType_idx" ON "account_mapping_templates"("operationType");
CREATE UNIQUE INDEX "account_mapping_templates_systemId_countryCode_operationType_key" ON "account_mapping_templates"("systemId", "countryCode", "operationType");

-- Create table for analytical dimensions
CREATE TABLE "analytical_dimensions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "allowedValues" JSONB,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytical_dimensions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "analytical_dimensions_systemId_code_key" ON "analytical_dimensions"("systemId", "code");
