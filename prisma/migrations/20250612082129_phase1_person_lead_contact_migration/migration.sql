/*
  Warnings:

  - You are about to drop the column `isActive` on the `service_settings` table. All the data in the column will be lost.
  - You are about to drop the column `analyticalDimensions` on the `vat_type_account_mappings` table. All the data in the column will be lost.
  - You are about to drop the column `subaccountPattern` on the `vat_type_account_mappings` table. All the data in the column will be lost.
  - You are about to drop the `contact_persons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `journal_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leads` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[vatTypeId,clinicId,legalEntityId]` on the table `vat_type_account_mappings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PersonRoleType" AS ENUM ('LEAD', 'CONTACT');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- DropIndex
DROP INDEX "vat_type_account_mappings_inputAccountId_idx";

-- DropIndex
DROP INDEX "vat_type_account_mappings_outputAccountId_idx";

-- DropIndex
DROP INDEX "vat_type_account_mappings_systemId_idx";

-- DropIndex
DROP INDEX "vat_type_account_mappings_vatTypeId_legalEntityId_clinicId_key";

-- AlterTable
ALTER TABLE "service_settings" DROP COLUMN "isActive";

-- AlterTable
ALTER TABLE "vat_type_account_mappings" DROP COLUMN "analyticalDimensions",
DROP COLUMN "subaccountPattern",
ALTER COLUMN "systemId" DROP NOT NULL;

-- DropTable
DROP TABLE "contact_persons";

-- DropTable
DROP TABLE "journal_entries";

-- DropTable
DROP TABLE "leads";

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "phoneCountryIsoCode" TEXT,
    "secondaryPhone" TEXT,
    "secondaryPhoneCountryIsoCode" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryIsoCode" TEXT,
    "nationalId" TEXT,
    "notes" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_functional_roles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "roleType" "PersonRoleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_functional_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_lead_data" (
    "id" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assignedToUserId" TEXT,
    "companyId" TEXT,
    "companyName" TEXT,

    CONSTRAINT "person_lead_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_contact_data" (
    "id" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "position" TEXT,
    "companyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "person_contact_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" DOUBLE PRECISION,
    "probability" INTEGER NOT NULL DEFAULT 0,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'PROSPECTING',
    "source" TEXT,
    "assignedToUserId" TEXT,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_relations" (
    "id" TEXT NOT NULL,
    "entityAType" TEXT NOT NULL,
    "entityAId" TEXT NOT NULL,
    "entityBType" TEXT NOT NULL,
    "entityBId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "direction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "entity_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "ticketId" TEXT,
    "invoiceId" TEXT,
    "cashSessionId" TEXT,
    "paymentId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "expenseId" TEXT,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_account_mappings" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "legal_entity_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "system_id" TEXT NOT NULL,
    "target_revenue" DECIMAL(10,2),
    "target_new_clients" INTEGER,
    "budgeted_discount" DECIMAL(10,2),
    "actual_revenue" DECIMAL(10,2),
    "actual_new_clients" INTEGER DEFAULT 0,
    "actual_discount" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "persons_systemId_idx" ON "persons"("systemId");

-- CreateIndex
CREATE INDEX "persons_email_idx" ON "persons"("email");

-- CreateIndex
CREATE INDEX "persons_phone_idx" ON "persons"("phone");

-- CreateIndex
CREATE INDEX "persons_lastName_idx" ON "persons"("lastName");

-- CreateIndex
CREATE INDEX "person_functional_roles_personId_idx" ON "person_functional_roles"("personId");

-- CreateIndex
CREATE INDEX "person_functional_roles_roleType_idx" ON "person_functional_roles"("roleType");

-- CreateIndex
CREATE INDEX "person_functional_roles_systemId_idx" ON "person_functional_roles"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "person_functional_roles_personId_roleType_key" ON "person_functional_roles"("personId", "roleType");

-- CreateIndex
CREATE UNIQUE INDEX "person_lead_data_functionalRoleId_key" ON "person_lead_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_lead_data_status_idx" ON "person_lead_data"("status");

-- CreateIndex
CREATE INDEX "person_lead_data_assignedToUserId_idx" ON "person_lead_data"("assignedToUserId");

-- CreateIndex
CREATE INDEX "person_lead_data_companyId_idx" ON "person_lead_data"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "person_contact_data_functionalRoleId_key" ON "person_contact_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_contact_data_companyId_idx" ON "person_contact_data"("companyId");

-- CreateIndex
CREATE INDEX "opportunities_personId_idx" ON "opportunities"("personId");

-- CreateIndex
CREATE INDEX "opportunities_stage_idx" ON "opportunities"("stage");

-- CreateIndex
CREATE INDEX "opportunities_assignedToUserId_idx" ON "opportunities"("assignedToUserId");

-- CreateIndex
CREATE INDEX "opportunities_systemId_idx" ON "opportunities"("systemId");

-- CreateIndex
CREATE INDEX "entity_relations_entityAId_idx" ON "entity_relations"("entityAId");

-- CreateIndex
CREATE INDEX "entity_relations_entityBId_idx" ON "entity_relations"("entityBId");

-- CreateIndex
CREATE INDEX "entity_relations_systemId_idx" ON "entity_relations"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_relations_entityAType_entityAId_entityBType_entityBI_key" ON "entity_relations"("entityAType", "entityAId", "entityBType", "entityBId", "relationType");

-- CreateIndex
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");

-- CreateIndex
CREATE INDEX "JournalEntry_ticketId_idx" ON "JournalEntry"("ticketId");

-- CreateIndex
CREATE INDEX "JournalEntry_invoiceId_idx" ON "JournalEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "JournalEntry_expenseId_idx" ON "JournalEntry"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_legalEntityId_key" ON "JournalEntry"("entryNumber", "legalEntityId");

-- CreateIndex
CREATE INDEX "idx_promotion_account_mapping_promotion_id" ON "promotion_account_mappings"("promotion_id");

-- CreateIndex
CREATE INDEX "idx_promotion_account_mapping_account_id" ON "promotion_account_mappings"("account_id");

-- CreateIndex
CREATE INDEX "idx_promotion_account_mapping_legal_entity_id" ON "promotion_account_mappings"("legal_entity_id");

-- CreateIndex
CREATE INDEX "idx_promotion_account_mapping_clinic_id" ON "promotion_account_mappings"("clinic_id");

-- CreateIndex
CREATE INDEX "idx_promotion_account_mapping_system_id" ON "promotion_account_mappings"("system_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_promotion_clinic" ON "promotion_account_mappings"("promotion_id", "clinic_id");

-- CreateIndex
CREATE INDEX "users_login_idx" ON "users"("login");

-- CreateIndex
CREATE INDEX "vat_type_account_mappings_clinicId_idx" ON "vat_type_account_mappings"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_type_account_mappings_vatTypeId_clinicId_legalEntityId_key" ON "vat_type_account_mappings"("vatTypeId", "clinicId", "legalEntityId");
