/*
  Warnings:

  - You are about to drop the `DocumentSeries` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BaseDocumentType" AS ENUM ('TICKET', 'INVOICE', 'CREDIT_NOTE', 'DELIVERY_NOTE', 'PURCHASE_ORDER', 'SALES_ORDER', 'QUOTE', 'PROFORMA_INVOICE');

-- CreateEnum
CREATE TYPE "ResetPolicy" AS ENUM ('YEARLY', 'MONTHLY', 'NEVER', 'FISCAL_YEAR');

-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSING_PROCESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST_OF_GOODS_SOLD');

-- DropTable
DROP TABLE "DocumentSeries";

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_account_entries" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "description" TEXT,
    "isSubAccount" BOOLEAN NOT NULL DEFAULT false,
    "parentAccountId" TEXT,
    "isMonetary" BOOLEAN NOT NULL DEFAULT true,
    "allowsDirectEntry" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_account_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_series" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "clinicId" TEXT,
    "code" TEXT NOT NULL,
    "documentType" "BaseDocumentType" NOT NULL,
    "prefix" TEXT,
    "padding" INTEGER,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "resetPolicy" "ResetPolicy",
    "lastResetAt" TIMESTAMP(3),
    "fiscalYearId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "document_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiscal_years_legalEntityId_idx" ON "fiscal_years"("legalEntityId");

-- CreateIndex
CREATE INDEX "fiscal_years_systemId_idx" ON "fiscal_years"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_legalEntityId_name_key" ON "fiscal_years"("legalEntityId", "name");

-- CreateIndex
CREATE INDEX "chart_of_account_entries_legalEntityId_idx" ON "chart_of_account_entries"("legalEntityId");

-- CreateIndex
CREATE INDEX "chart_of_account_entries_systemId_idx" ON "chart_of_account_entries"("systemId");

-- CreateIndex
CREATE INDEX "chart_of_account_entries_parentAccountId_idx" ON "chart_of_account_entries"("parentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_entries_legalEntityId_accountNumber_key" ON "chart_of_account_entries"("legalEntityId", "accountNumber");

-- CreateIndex
CREATE INDEX "document_series_organizationId_idx" ON "document_series"("organizationId");

-- CreateIndex
CREATE INDEX "document_series_legalEntityId_idx" ON "document_series"("legalEntityId");

-- CreateIndex
CREATE INDEX "document_series_clinicId_idx" ON "document_series"("clinicId");

-- CreateIndex
CREATE INDEX "document_series_documentType_idx" ON "document_series"("documentType");

-- CreateIndex
CREATE INDEX "document_series_fiscalYearId_idx" ON "document_series"("fiscalYearId");

-- CreateIndex
CREATE UNIQUE INDEX "document_series_legalEntityId_code_key" ON "document_series"("legalEntityId", "code");
