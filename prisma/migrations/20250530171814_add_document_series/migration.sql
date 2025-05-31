-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TICKET', 'INVOICE', 'CREDIT_NOTE', 'DELIVERY_NOTE');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "documentSeriesId" TEXT;

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clinicId" TEXT,
    "code" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "prefix" TEXT DEFAULT '',
    "padding" INTEGER NOT NULL DEFAULT 6,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "resetPolicy" TEXT NOT NULL DEFAULT 'NEVER',
    "lastResetAt" TIMESTAMP(3),

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSeries_organizationId_clinicId_code_documentType_key" ON "DocumentSeries"("organizationId", "clinicId", "code", "documentType");

-- CreateIndex
CREATE INDEX "tickets_cashSessionId_idx" ON "tickets"("cashSessionId");

-- CreateIndex
CREATE INDEX "tickets_documentSeriesId_idx" ON "tickets"("documentSeriesId");
