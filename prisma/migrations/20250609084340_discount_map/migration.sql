/*
  Warnings:

  - You are about to drop the `Bank` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[paymentMethodDefinitionId,legalEntityId,clinicId]` on the table `payment_method_account_mappings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,legalEntityId,clinicId,accountType]` on the table `product_account_mappings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serviceId,legalEntityId,clinicId]` on the table `service_account_mappings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vatTypeId,legalEntityId,clinicId]` on the table `vat_type_account_mappings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "discount_type_account_mappings" DROP CONSTRAINT "discount_type_account_mappings_clinicId_fkey";

-- DropForeignKey
ALTER TABLE "expense_type_account_mappings" DROP CONSTRAINT "expense_type_account_mappings_clinicId_fkey";

-- DropIndex
DROP INDEX "chart_of_account_entries_legalEntityId_accountNumber_key";

-- DropIndex
DROP INDEX "payment_method_account_mappings_paymentMethodDefinitionId_l_key";

-- DropIndex
DROP INDEX "payment_method_account_mappings_paymentMethodDefinitionId_legal";

-- DropIndex
DROP INDEX "product_account_mappings_productId_legalEntityId_key";

-- DropIndex
DROP INDEX "product_account_mappings_productId_legalEntityId_systemId_clini";

-- DropIndex
DROP INDEX "service_account_mappings_serviceId_legalEntityId_key";

-- DropIndex
DROP INDEX "vat_type_account_mappings_clinicId_idx";

-- DropIndex
DROP INDEX "vat_type_account_mappings_vatTypeId_legalEntityId_key";

-- DropIndex
DROP INDEX "vat_type_account_mappings_vatTypeId_legalEntityId_systemId_clin";

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "discount_type_account_mappings" ADD COLUMN     "discountTypeId" TEXT;

-- AlterTable
ALTER TABLE "payment_method_definitions" ADD COLUMN     "bankId" TEXT;

-- AlterTable
ALTER TABLE "service_account_mappings" ADD COLUMN     "clinicId" TEXT;

-- AlterTable
ALTER TABLE "user_clinic_assignments" ADD COLUMN     "userClinicScheduleId" TEXT;

-- DropTable
DROP TABLE "Bank";

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "phone" TEXT,
    "phone1CountryIsoCode" TEXT,
    "phone2" TEXT,
    "phone2CountryIsoCode" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "countryIsoCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bank_countryIsoCode_idx" ON "banks"("countryIsoCode");

-- CreateIndex
CREATE INDEX "Bank_systemId_idx" ON "banks"("systemId");

-- CreateIndex
CREATE INDEX "banks_accountId_idx" ON "banks"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_name_systemId_key" ON "banks"("name", "systemId");

-- CreateIndex
CREATE INDEX "BankAccount_accountId_idx" ON "BankAccount"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_account_mappings_paymentMethodDefinitionId_l_key" ON "payment_method_account_mappings"("paymentMethodDefinitionId", "legalEntityId", "clinicId");

-- CreateIndex
CREATE INDEX "payment_method_definitions_bankId_idx" ON "payment_method_definitions"("bankId");

-- CreateIndex
CREATE UNIQUE INDEX "product_account_mappings_productId_legalEntityId_clinicId_a_key" ON "product_account_mappings"("productId", "legalEntityId", "clinicId", "accountType");

-- CreateIndex
CREATE INDEX "service_account_mappings_clinicId_idx" ON "service_account_mappings"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "service_account_mappings_serviceId_legalEntityId_clinicId_key" ON "service_account_mappings"("serviceId", "legalEntityId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_type_account_mappings_vatTypeId_legalEntityId_clinicId_key" ON "vat_type_account_mappings"("vatTypeId", "legalEntityId", "clinicId");
