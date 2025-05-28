-- CreateEnum
CREATE TYPE "DebtAdjustmentType" AS ENUM ('CANCELLATION', 'ADMINISTRATIVE_CORRECTION', 'OTHER');

-- AlterTable
ALTER TABLE "debt_ledgers" ADD COLUMN     "cashSessionId" TEXT;

-- CreateTable
CREATE TABLE "debt_adjustments" (
    "id" TEXT NOT NULL,
    "debtLedgerId" TEXT NOT NULL,
    "adjustmentType" "DebtAdjustmentType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "debt_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_adjustments_debtLedgerId_idx" ON "debt_adjustments"("debtLedgerId");

-- CreateIndex
CREATE INDEX "debt_adjustments_userId_idx" ON "debt_adjustments"("userId");

-- CreateIndex
CREATE INDEX "debt_adjustments_systemId_idx" ON "debt_adjustments"("systemId");

-- CreateIndex
CREATE INDEX "debt_adjustments_adjustmentType_idx" ON "debt_adjustments"("adjustmentType");

-- CreateIndex
CREATE INDEX "debt_ledgers_cashSessionId_idx" ON "debt_ledgers"("cashSessionId");
