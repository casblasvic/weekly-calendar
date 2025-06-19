/*
  Warnings:

  - You are about to drop the column `extendedBy` on the `appointment_extensions` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `appointment_extensions` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `bono_instances` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `debt_ledgers` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `employment_contracts` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `loyalty_ledgers` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `package_instances` table. All the data in the column will be lost.
  - You are about to drop the column `payerClientId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `time_logs` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `client_relations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_persons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `journal_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leads` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `extendedByUserId` to the `appointment_extensions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `extendedMinutes` to the `appointment_extensions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `debt_ledgers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `loyalty_ledgers` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AppointmentServiceStatus" AS ENUM ('SCHEDULED', 'VALIDATED', 'CANCELLED', 'NO_SHOW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'PERSON';
ALTER TYPE "EntityType" ADD VALUE 'TARIFA';

-- DropIndex
DROP INDEX "appointment_extensions_userId_idx";

-- DropIndex
DROP INDEX "appointments_clientId_idx";

-- DropIndex
DROP INDEX "bono_instances_clientId_idx";

-- DropIndex
DROP INDEX "debt_ledgers_clientId_idx";

-- DropIndex
DROP INDEX "employment_contracts_clientId_idx";

-- DropIndex
DROP INDEX "invoices_clientId_idx";

-- DropIndex
DROP INDEX "loyalty_ledgers_clientId_idx";

-- DropIndex
DROP INDEX "package_instances_clientId_idx";

-- DropIndex
DROP INDEX "payments_payerClientId_idx";

-- DropIndex
DROP INDEX "tickets_clientId_idx";

-- DropIndex
DROP INDEX "time_logs_clientId_idx";

-- AlterTable
ALTER TABLE "appointment_extensions" DROP COLUMN "extendedBy",
DROP COLUMN "userId",
ADD COLUMN     "extendedByUserId" TEXT NOT NULL,
ADD COLUMN     "extendedMinutes" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT NOT NULL,
ADD COLUMN     "roomId" TEXT;

-- AlterTable
ALTER TABLE "bono_instances" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "clinic_schedules" ADD COLUMN     "createGranularity" INTEGER DEFAULT 5;

-- AlterTable
ALTER TABLE "debt_ledgers" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "employment_contracts" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "loyalty_ledgers" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "package_instances" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payerClientId",
ADD COLUMN     "payerPersonId" TEXT;

-- AlterTable
ALTER TABLE "schedule_templates" ADD COLUMN     "createGranularity" INTEGER DEFAULT 5;

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "time_logs" DROP COLUMN "clientId",
ADD COLUMN     "personId" TEXT;

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "client_relations";

-- DropTable
DROP TABLE "contact_persons";

-- DropTable
DROP TABLE "journal_entries";

-- DropTable
DROP TABLE "leads";

-- CreateTable
CREATE TABLE "appointment_services" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "AppointmentServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedDuration" INTEGER,
    "notes" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByUserId" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentTag" (
    "appointmentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentTag_pkey" PRIMARY KEY ("appointmentId","tagId")
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
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryIsoCode" TEXT,
    "nationalId" TEXT,
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nationalIdType" TEXT,
    "passportCountry" TEXT,
    "passportNumber" TEXT,
    "stateProvince" TEXT,
    "taxId" TEXT,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_functional_roles" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleType" TEXT NOT NULL,

    CONSTRAINT "person_functional_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_lead_data" (
    "id" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "source" TEXT,
    "assignedToUserId" TEXT,
    "companyId" TEXT,
    "companyName" TEXT,
    "conversionDate" TIMESTAMP(3),
    "conversionToRole" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "interests" TEXT,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "priority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',

    CONSTRAINT "person_lead_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_contact_data" (
    "id" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "position" TEXT,
    "companyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "department" TEXT,
    "preferredContactMethod" TEXT,

    CONSTRAINT "person_contact_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "probability" DOUBLE PRECISION,
    "actualCloseDate" TIMESTAMP(3),
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clinicId" TEXT NOT NULL,
    "estimatedCloseDate" TIMESTAMP(3),
    "estimatedValue" DOUBLE PRECISION,
    "leadDataId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "wonLostReason" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'PROSPECTING',

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_client_data" (
    "id" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryIsoCode" TEXT,
    "phoneCountryIsoCode" TEXT,
    "secondaryPhone" TEXT,
    "secondaryPhoneCountryIsoCode" TEXT,
    "fiscalName" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "originClinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_client_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_services_appointmentId_idx" ON "appointment_services"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_services_serviceId_idx" ON "appointment_services"("serviceId");

-- CreateIndex
CREATE INDEX "appointment_services_status_idx" ON "appointment_services"("status");

-- CreateIndex
CREATE INDEX "appointment_services_validatedAt_idx" ON "appointment_services"("validatedAt");

-- CreateIndex
CREATE INDEX "appointment_services_validatedByUserId_idx" ON "appointment_services"("validatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_services_appointmentId_serviceId_key" ON "appointment_services"("appointmentId", "serviceId");

-- CreateIndex
CREATE INDEX "Tag_systemId_idx" ON "Tag"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_systemId_name_key" ON "Tag"("systemId", "name");

-- CreateIndex
CREATE INDEX "AppointmentTag_appointmentId_idx" ON "AppointmentTag"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentTag_tagId_idx" ON "AppointmentTag"("tagId");

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
CREATE INDEX "persons_systemId_idx" ON "persons"("systemId");

-- CreateIndex
CREATE INDEX "persons_email_idx" ON "persons"("email");

-- CreateIndex
CREATE INDEX "persons_phone_idx" ON "persons"("phone");

-- CreateIndex
CREATE INDEX "person_functional_roles_personId_idx" ON "person_functional_roles"("personId");

-- CreateIndex
CREATE INDEX "person_functional_roles_systemId_idx" ON "person_functional_roles"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "person_functional_roles_personId_roleType_key" ON "person_functional_roles"("personId", "roleType");

-- CreateIndex
CREATE UNIQUE INDEX "person_lead_data_functionalRoleId_key" ON "person_lead_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_lead_data_functionalRoleId_idx" ON "person_lead_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_lead_data_assignedToUserId_idx" ON "person_lead_data"("assignedToUserId");

-- CreateIndex
CREATE INDEX "person_lead_data_companyId_idx" ON "person_lead_data"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "person_contact_data_functionalRoleId_key" ON "person_contact_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_contact_data_functionalRoleId_idx" ON "person_contact_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_contact_data_companyId_idx" ON "person_contact_data"("companyId");

-- CreateIndex
CREATE INDEX "opportunities_leadDataId_idx" ON "opportunities"("leadDataId");

-- CreateIndex
CREATE INDEX "opportunities_clinicId_idx" ON "opportunities"("clinicId");

-- CreateIndex
CREATE INDEX "opportunities_systemId_idx" ON "opportunities"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "person_client_data_functionalRoleId_key" ON "person_client_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_client_data_functionalRoleId_idx" ON "person_client_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_client_data_companyId_idx" ON "person_client_data"("companyId");

-- CreateIndex
CREATE INDEX "person_client_data_originClinicId_idx" ON "person_client_data"("originClinicId");

-- CreateIndex
CREATE INDEX "appointment_extensions_extendedByUserId_idx" ON "appointment_extensions"("extendedByUserId");

-- CreateIndex
CREATE INDEX "appointments_personId_idx" ON "appointments"("personId");

-- CreateIndex
CREATE INDEX "appointments_roomId_idx" ON "appointments"("roomId");

-- CreateIndex
CREATE INDEX "bono_instances_personId_idx" ON "bono_instances"("personId");

-- CreateIndex
CREATE INDEX "debt_ledgers_personId_idx" ON "debt_ledgers"("personId");

-- CreateIndex
CREATE INDEX "invoices_personId_idx" ON "invoices"("personId");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_personId_idx" ON "loyalty_ledgers"("personId");

-- CreateIndex
CREATE INDEX "package_instances_personId_idx" ON "package_instances"("personId");

-- CreateIndex
CREATE INDEX "payments_payerPersonId_idx" ON "payments"("payerPersonId");

-- CreateIndex
CREATE INDEX "tickets_personId_idx" ON "tickets"("personId");

-- CreateIndex
CREATE INDEX "time_logs_personId_idx" ON "time_logs"("personId");
