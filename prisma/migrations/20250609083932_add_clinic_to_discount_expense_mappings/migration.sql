/*
  Warnings:

  - A unique constraint covering the columns `[discountTypeCode,legalEntityId,clinicId]` on the table `discount_type_account_mappings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[expenseTypeId,legalEntityId,clinicId]` on the table `expense_type_account_mappings` will be added. If there are existing duplicate values, this will fail.

*/

-- AlterTable
ALTER TABLE "discount_type_account_mappings" ADD COLUMN "clinicId" TEXT;

-- AlterTable
ALTER TABLE "expense_type_account_mappings" ADD COLUMN "clinicId" TEXT;

-- CreateIndex
CREATE INDEX "discount_type_account_mappings_clinicId_idx" ON "discount_type_account_mappings"("clinicId");

-- CreateIndex
CREATE INDEX "expense_type_account_mappings_clinicId_idx" ON "expense_type_account_mappings"("clinicId");

-- DropIndex
DROP INDEX "discount_type_account_mappings_discountTypeCode_legalEntity_key";

-- DropIndex
DROP INDEX "expense_type_account_mappings_expenseTypeId_legalEntityId_key";

-- CreateIndex
CREATE UNIQUE INDEX "discount_type_account_mappings_discountTypeCode_legalEntity_key" ON "discount_type_account_mappings"("discountTypeCode", "legalEntityId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_type_account_mappings_expenseTypeId_legalEntityId_c_key" ON "expense_type_account_mappings"("expenseTypeId", "legalEntityId", "clinicId");

-- AddForeignKey
ALTER TABLE "discount_type_account_mappings" ADD CONSTRAINT "discount_type_account_mappings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_type_account_mappings" ADD CONSTRAINT "expense_type_account_mappings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
