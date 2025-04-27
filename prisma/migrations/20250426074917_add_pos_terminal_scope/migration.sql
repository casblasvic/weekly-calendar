/*
  Warnings:

  - You are about to drop the column `createdAt` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `BankAccount` table. All the data in the column will be lost.
  - You are about to drop the `ClinicPaymentSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PosTerminal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PosTerminalClinicScope` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[accountName,bankId,systemId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BankAccount_accountName_systemId_key";

-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "ClinicPaymentSetting";

-- DropTable
DROP TABLE "PosTerminal";

-- DropTable
DROP TABLE "PosTerminalClinicScope";

-- CreateTable
CREATE TABLE "pos_terminals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terminalIdProvider" TEXT,
    "provider" TEXT,
    "modelNumber" TEXT,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "bankAccountId" TEXT,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_terminal_clinic_scopes" (
    "posTerminalId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "pos_terminal_clinic_scopes_pkey" PRIMARY KEY ("posTerminalId","clinicId")
);

-- CreateTable
CREATE TABLE "clinic_payment_settings" (
    "id" TEXT NOT NULL,
    "isActiveInClinic" BOOLEAN NOT NULL DEFAULT true,
    "receivingBankAccountId" TEXT,
    "posTerminalId" TEXT,
    "isDefaultPosTerminal" BOOLEAN DEFAULT false,
    "isDefaultReceivingBankAccount" BOOLEAN DEFAULT false,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "paymentMethodDefinitionId" TEXT NOT NULL,

    CONSTRAINT "clinic_payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_terminals_bankAccountId_idx" ON "pos_terminals"("bankAccountId");

-- CreateIndex
CREATE INDEX "pos_terminals_systemId_idx" ON "pos_terminals"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_terminals_name_systemId_key" ON "pos_terminals"("name", "systemId");

-- CreateIndex
CREATE INDEX "pos_terminal_clinic_scopes_clinicId_idx" ON "pos_terminal_clinic_scopes"("clinicId");

-- CreateIndex
CREATE INDEX "clinic_payment_settings_receivingBankAccountId_idx" ON "clinic_payment_settings"("receivingBankAccountId");

-- CreateIndex
CREATE INDEX "clinic_payment_settings_posTerminalId_idx" ON "clinic_payment_settings"("posTerminalId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_payment_settings_clinicId_paymentMethodDefinitionId_key" ON "clinic_payment_settings"("clinicId", "paymentMethodDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountName_bankId_systemId_key" ON "BankAccount"("accountName", "bankId", "systemId");
