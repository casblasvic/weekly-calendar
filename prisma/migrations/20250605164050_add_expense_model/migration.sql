/*
  Warnings:

  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'EXPENSE';

-- AlterTable
ALTER TABLE "debt_ledgers" ADD COLUMN     "legalEntityId" TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "expenseId" TEXT;

-- DropTable
DROP TABLE "Payment";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "transactionReference" TEXT,
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "invoiceId" TEXT,
    "paymentMethodDefinitionId" TEXT,
    "posTerminalId" TEXT,
    "bankAccountId" TEXT,
    "cashSessionId" TEXT,
    "bonoInstanceId" TEXT,
    "payerClientId" TEXT,
    "payerCompanyId" TEXT,
    "debtLedgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expenseTypeId" TEXT NOT NULL,
    "supplierId" TEXT,
    "userId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
    "subtotalAmount" DECIMAL(15,2) NOT NULL,
    "vatAmount" DECIMAL(15,2) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "vatTypeId" TEXT,
    "clinicId" TEXT,
    "systemId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_systemId_idx" ON "payments"("systemId");

-- CreateIndex
CREATE INDEX "payments_clinicId_idx" ON "payments"("clinicId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_ticketId_idx" ON "payments"("ticketId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_paymentMethodDefinitionId_idx" ON "payments"("paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "payments_posTerminalId_idx" ON "payments"("posTerminalId");

-- CreateIndex
CREATE INDEX "payments_bankAccountId_idx" ON "payments"("bankAccountId");

-- CreateIndex
CREATE INDEX "payments_cashSessionId_idx" ON "payments"("cashSessionId");

-- CreateIndex
CREATE INDEX "payments_bonoInstanceId_idx" ON "payments"("bonoInstanceId");

-- CreateIndex
CREATE INDEX "payments_payerClientId_idx" ON "payments"("payerClientId");

-- CreateIndex
CREATE INDEX "payments_payerCompanyId_idx" ON "payments"("payerCompanyId");

-- CreateIndex
CREATE INDEX "payments_debtLedgerId_idx" ON "payments"("debtLedgerId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_expenseTypeId_idx" ON "expenses"("expenseTypeId");

-- CreateIndex
CREATE INDEX "expenses_supplierId_idx" ON "expenses"("supplierId");

-- CreateIndex
CREATE INDEX "expenses_userId_idx" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_clinicId_idx" ON "expenses"("clinicId");

-- CreateIndex
CREATE INDEX "expenses_systemId_idx" ON "expenses"("systemId");

-- CreateIndex
CREATE INDEX "expenses_legalEntityId_idx" ON "expenses"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expenseNumber_systemId_key" ON "expenses"("expenseNumber", "systemId");

-- CreateIndex
CREATE INDEX "journal_entries_expenseId_idx" ON "journal_entries"("expenseId");
