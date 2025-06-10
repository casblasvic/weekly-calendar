/*
  Warnings:

  - Added the required column `updatedAt` to the `product_account_mappings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `service_account_mappings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "expense_types" ADD COLUMN     "chartOfAccountEntryId" TEXT;

-- AlterTable
ALTER TABLE "product_account_mappings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "service_account_mappings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "vat_type_account_mappings" ADD COLUMN     "chartOfAccountEntryId" TEXT;

-- DropEnum
DROP TYPE "DocumentType";

-- RenameIndex
ALTER INDEX "account_mapping_templates_systemId_countryCode_operationType_ke" RENAME TO "account_mapping_templates_systemId_countryCode_operationTyp_key";
