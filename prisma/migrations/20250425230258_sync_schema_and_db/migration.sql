/*
  Warnings:

  - You are about to drop the `bank_account_clinic_scopes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bank_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `banks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clinic_payment_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `companies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pos_terminal_clinic_scopes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pos_terminals` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "employment_contracts" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "time_logs" ADD COLUMN     "clientId" TEXT;

-- DropTable
DROP TABLE "bank_account_clinic_scopes";

-- DropTable
DROP TABLE "bank_accounts";

-- DropTable
DROP TABLE "banks";

-- DropTable
DROP TABLE "clients";

-- DropTable
DROP TABLE "clinic_payment_settings";

-- DropTable
DROP TABLE "companies";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "pos_terminal_clinic_scopes";

-- DropTable
DROP TABLE "pos_terminals";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "fiscalName" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryIsoCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "phone" TEXT,
    "phone1CountryIsoCode" TEXT,
    "phone2" TEXT,
    "phone2CountryIsoCode" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "countryIsoCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swiftBic" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "bankId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountClinicScope" (
    "bankAccountId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccountClinicScope_pkey" PRIMARY KEY ("bankAccountId","clinicId")
);

-- CreateTable
CREATE TABLE "PosTerminal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "model" TEXT,
    "brand" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "bankAccountId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosTerminalClinicScope" (
    "posTerminalId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosTerminalClinicScope_pkey" PRIMARY KEY ("posTerminalId","clinicId")
);

-- CreateTable
CREATE TABLE "Payment" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPaymentSetting" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "paymentMethodDefinitionId" TEXT NOT NULL,
    "isActiveInClinic" BOOLEAN NOT NULL DEFAULT true,
    "receivingBankAccountId" TEXT,
    "defaultPosTerminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPaymentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_taxId_key" ON "Company"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE INDEX "Company_systemId_idx" ON "Company"("systemId");

-- CreateIndex
CREATE INDEX "Company_countryIsoCode_idx" ON "Company"("countryIsoCode");

-- CreateIndex
CREATE UNIQUE INDEX "Company_taxId_systemId_key" ON "Company"("taxId", "systemId");

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
CREATE INDEX "Bank_systemId_idx" ON "Bank"("systemId");

-- CreateIndex
CREATE INDEX "Bank_countryIsoCode_idx" ON "Bank"("countryIsoCode");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_name_systemId_key" ON "Bank"("name", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_iban_key" ON "BankAccount"("iban");

-- CreateIndex
CREATE INDEX "BankAccount_bankId_idx" ON "BankAccount"("bankId");

-- CreateIndex
CREATE INDEX "BankAccount_systemId_idx" ON "BankAccount"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_accountName_systemId_key" ON "BankAccount"("accountName", "systemId");

-- CreateIndex
CREATE INDEX "BankAccountClinicScope_bankAccountId_idx" ON "BankAccountClinicScope"("bankAccountId");

-- CreateIndex
CREATE INDEX "BankAccountClinicScope_clinicId_idx" ON "BankAccountClinicScope"("clinicId");

-- CreateIndex
CREATE INDEX "PosTerminal_bankAccountId_idx" ON "PosTerminal"("bankAccountId");

-- CreateIndex
CREATE INDEX "PosTerminal_systemId_idx" ON "PosTerminal"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "PosTerminal_name_systemId_key" ON "PosTerminal"("name", "systemId");

-- CreateIndex
CREATE INDEX "PosTerminalClinicScope_posTerminalId_idx" ON "PosTerminalClinicScope"("posTerminalId");

-- CreateIndex
CREATE INDEX "PosTerminalClinicScope_clinicId_idx" ON "PosTerminalClinicScope"("clinicId");

-- CreateIndex
CREATE INDEX "Payment_systemId_idx" ON "Payment"("systemId");

-- CreateIndex
CREATE INDEX "Payment_clinicId_idx" ON "Payment"("clinicId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_ticketId_idx" ON "Payment"("ticketId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_paymentMethodDefinitionId_idx" ON "Payment"("paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "Payment_posTerminalId_idx" ON "Payment"("posTerminalId");

-- CreateIndex
CREATE INDEX "Payment_bankAccountId_idx" ON "Payment"("bankAccountId");

-- CreateIndex
CREATE INDEX "Payment_cashSessionId_idx" ON "Payment"("cashSessionId");

-- CreateIndex
CREATE INDEX "Payment_bonoInstanceId_idx" ON "Payment"("bonoInstanceId");

-- CreateIndex
CREATE INDEX "Payment_payerClientId_idx" ON "Payment"("payerClientId");

-- CreateIndex
CREATE INDEX "Payment_payerCompanyId_idx" ON "Payment"("payerCompanyId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_systemId_idx" ON "ClinicPaymentSetting"("systemId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_paymentMethodDefinitionId_idx" ON "ClinicPaymentSetting"("paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_receivingBankAccountId_idx" ON "ClinicPaymentSetting"("receivingBankAccountId");

-- CreateIndex
CREATE INDEX "ClinicPaymentSetting_defaultPosTerminalId_idx" ON "ClinicPaymentSetting"("defaultPosTerminalId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPaymentSetting_clinicId_paymentMethodDefinitionId_key" ON "ClinicPaymentSetting"("clinicId", "paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "employment_contracts_clientId_idx" ON "employment_contracts"("clientId");

-- CreateIndex
CREATE INDEX "leads_companyId_idx" ON "leads"("companyId");

-- CreateIndex
CREATE INDEX "time_logs_clientId_idx" ON "time_logs"("clientId");
