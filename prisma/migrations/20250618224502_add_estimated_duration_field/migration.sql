/*
  Warnings:

  - The values [PERSON,TARIFA] on the enum `EntityType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `personId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `bono_instances` table. All the data in the column will be lost.
  - You are about to drop the column `createGranularity` on the `clinic_schedules` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `debt_ledgers` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `loyalty_ledgers` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `package_instances` table. All the data in the column will be lost.
  - You are about to drop the column `payerPersonId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `createGranularity` on the `schedule_templates` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `time_logs` table. All the data in the column will be lost.
  - You are about to drop the `AppointmentTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JournalEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `appointment_services` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `opportunities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `person_client_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `person_contact_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `person_functional_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `person_lead_data` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `persons` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `clientId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `bono_instances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `debt_ledgers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `loyalty_ledgers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `package_instances` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EntityType_new" AS ENUM ('SYSTEM', 'USER', 'CLIENT', 'COMPANY', 'CONTACT_PERSON', 'LEAD', 'CLINIC', 'EQUIPMENT', 'DEVICE', 'SERVICE', 'PRODUCT', 'APPOINTMENT', 'TICKET', 'PAYMENT', 'EMPLOYMENT_CONTRACT', 'INVOICE', 'BANK', 'BANK_ACCOUNT', 'PROMOTION', 'BONO_DEFINITION', 'PACKAGE_DEFINITION', 'CASH_SESSION', 'DEBT_LEDGER', 'DEBT_ADJUSTMENT', 'FISCAL_YEAR', 'EXPENSE');
ALTER TABLE "entity_images" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TABLE "entity_documents" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TABLE "entity_change_logs" ALTER COLUMN "entityType" TYPE "EntityType_new" USING ("entityType"::text::"EntityType_new");
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
ALTER TYPE "EntityType_new" RENAME TO "EntityType";
DROP TYPE "EntityType_old";
COMMIT;

-- DropIndex
DROP INDEX "appointments_personId_idx";

-- DropIndex
DROP INDEX "appointments_roomId_idx";

-- DropIndex
DROP INDEX "bono_instances_personId_idx";

-- DropIndex
DROP INDEX "debt_ledgers_personId_idx";

-- DropIndex
DROP INDEX "invoices_personId_idx";

-- DropIndex
DROP INDEX "loyalty_ledgers_personId_idx";

-- DropIndex
DROP INDEX "package_instances_personId_idx";

-- DropIndex
DROP INDEX "payments_payerPersonId_idx";

-- DropIndex
DROP INDEX "tickets_personId_idx";

-- DropIndex
DROP INDEX "time_logs_personId_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "personId",
DROP COLUMN "roomId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "estimatedDurationMinutes" INTEGER;

-- AlterTable
ALTER TABLE "bono_instances" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "clinic_schedules" DROP COLUMN "createGranularity";

-- AlterTable
ALTER TABLE "debt_ledgers" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "employment_contracts" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "loyalty_ledgers" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "package_instances" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payerPersonId",
ADD COLUMN     "payerClientId" TEXT;

-- AlterTable
ALTER TABLE "schedule_templates" DROP COLUMN "createGranularity";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "time_logs" DROP COLUMN "personId",
ADD COLUMN     "clientId" TEXT;

-- DropTable
DROP TABLE "AppointmentTag";

-- DropTable
DROP TABLE "JournalEntry";

-- DropTable
DROP TABLE "Tag";

-- DropTable
DROP TABLE "appointment_services";

-- DropTable
DROP TABLE "opportunities";

-- DropTable
DROP TABLE "person_client_data";

-- DropTable
DROP TABLE "person_contact_data";

-- DropTable
DROP TABLE "person_functional_roles";

-- DropTable
DROP TABLE "person_lead_data";

-- DropTable
DROP TABLE "persons";

-- DropEnum
DROP TYPE "AppointmentServiceStatus";

-- CreateTable
CREATE TABLE "contact_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedToUserId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
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
    "fiscalName" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "companyId" TEXT,
    "originClinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_relations" (
    "clientAId" TEXT NOT NULL,
    "clientBId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_relations_pkey" PRIMARY KEY ("clientAId","clientBId")
);

-- CreateTable
CREATE TABLE "journal_entries" (
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

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_persons_companyId_idx" ON "contact_persons"("companyId");

-- CreateIndex
CREATE INDEX "contact_persons_systemId_idx" ON "contact_persons"("systemId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_assignedToUserId_idx" ON "leads"("assignedToUserId");

-- CreateIndex
CREATE INDEX "leads_systemId_idx" ON "leads"("systemId");

-- CreateIndex
CREATE INDEX "leads_companyId_idx" ON "leads"("companyId");

-- CreateIndex
CREATE INDEX "Client_systemId_idx" ON "Client"("systemId");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE INDEX "Client_countryIsoCode_idx" ON "Client"("countryIsoCode");

-- CreateIndex
CREATE INDEX "Client_lastName_idx" ON "Client"("lastName");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_originClinicId_idx" ON "Client"("originClinicId");

-- CreateIndex
CREATE INDEX "client_relations_clientAId_idx" ON "client_relations"("clientAId");

-- CreateIndex
CREATE INDEX "client_relations_clientBId_idx" ON "client_relations"("clientBId");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_ticketId_idx" ON "journal_entries"("ticketId");

-- CreateIndex
CREATE INDEX "journal_entries_invoiceId_idx" ON "journal_entries"("invoiceId");

-- CreateIndex
CREATE INDEX "journal_entries_expenseId_idx" ON "journal_entries"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entryNumber_legalEntityId_key" ON "journal_entries"("entryNumber", "legalEntityId");

-- CreateIndex
CREATE INDEX "appointments_clientId_idx" ON "appointments"("clientId");

-- CreateIndex
CREATE INDEX "bono_instances_clientId_idx" ON "bono_instances"("clientId");

-- CreateIndex
CREATE INDEX "debt_ledgers_clientId_idx" ON "debt_ledgers"("clientId");

-- CreateIndex
CREATE INDEX "employment_contracts_clientId_idx" ON "employment_contracts"("clientId");

-- CreateIndex
CREATE INDEX "invoices_clientId_idx" ON "invoices"("clientId");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_clientId_idx" ON "loyalty_ledgers"("clientId");

-- CreateIndex
CREATE INDEX "package_instances_clientId_idx" ON "package_instances"("clientId");

-- CreateIndex
CREATE INDEX "payments_payerClientId_idx" ON "payments"("payerClientId");

-- CreateIndex
CREATE INDEX "tickets_clientId_idx" ON "tickets"("clientId");

-- CreateIndex
CREATE INDEX "time_logs_clientId_idx" ON "time_logs"("clientId");
