-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "debtLedgerId" TEXT;

-- CreateTable
CREATE TABLE "debt_ledgers" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "clientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingAmount" DOUBLE PRECISION NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debt_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_ledgers_ticketId_idx" ON "debt_ledgers"("ticketId");

-- CreateIndex
CREATE INDEX "debt_ledgers_invoiceId_idx" ON "debt_ledgers"("invoiceId");

-- CreateIndex
CREATE INDEX "debt_ledgers_clientId_idx" ON "debt_ledgers"("clientId");

-- CreateIndex
CREATE INDEX "debt_ledgers_clinicId_idx" ON "debt_ledgers"("clinicId");

-- CreateIndex
CREATE INDEX "debt_ledgers_systemId_idx" ON "debt_ledgers"("systemId");

-- CreateIndex
CREATE INDEX "debt_ledgers_status_idx" ON "debt_ledgers"("status");

-- CreateIndex
CREATE INDEX "Payment_debtLedgerId_idx" ON "Payment"("debtLedgerId");
