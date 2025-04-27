/*
  Warnings:

  - You are about to drop the column `clinicId` on the `bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `clinicId` on the `pos_terminals` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bank_accounts_clinicId_idx";

-- DropIndex
DROP INDEX "pos_terminals_clinicId_idx";

-- AlterTable
ALTER TABLE "bank_accounts" DROP COLUMN "clinicId",
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "banks" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "pos_terminals" DROP COLUMN "clinicId",
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "bank_clinic_scopes" (
    "bankId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "bank_clinic_scopes_pkey" PRIMARY KEY ("bankId","clinicId")
);

-- CreateTable
CREATE TABLE "bank_account_clinic_scopes" (
    "bankAccountId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "bank_account_clinic_scopes_pkey" PRIMARY KEY ("bankAccountId","clinicId")
);

-- CreateTable
CREATE TABLE "pos_terminal_clinic_scopes" (
    "posTerminalId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "pos_terminal_clinic_scopes_pkey" PRIMARY KEY ("posTerminalId","clinicId")
);

-- CreateIndex
CREATE INDEX "bank_clinic_scopes_clinicId_idx" ON "bank_clinic_scopes"("clinicId");

-- CreateIndex
CREATE INDEX "bank_account_clinic_scopes_clinicId_idx" ON "bank_account_clinic_scopes"("clinicId");

-- CreateIndex
CREATE INDEX "pos_terminal_clinic_scopes_clinicId_idx" ON "pos_terminal_clinic_scopes"("clinicId");
