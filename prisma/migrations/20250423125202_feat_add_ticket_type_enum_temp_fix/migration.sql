/*
  Warnings:

  - You are about to drop the column `bankName` on the `bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `ticket_items` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercent` on the `ticket_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceId]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bankId` to the `bank_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethodDefinitionId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyCode` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE_GATEWAY', 'CHECK', 'INTERNAL_CREDIT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('SALE', 'RETURN');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EntityType" ADD VALUE 'INVOICE';
ALTER TYPE "EntityType" ADD VALUE 'BANK';
ALTER TYPE "EntityType" ADD VALUE 'BANK_ACCOUNT';
ALTER TYPE "EntityType" ADD VALUE 'PROMOTION';
ALTER TYPE "EntityType" ADD VALUE 'BONO_DEFINITION';
ALTER TYPE "EntityType" ADD VALUE 'PACKAGE_DEFINITION';

-- DropIndex
DROP INDEX "service_consumptions_serviceId_productId_key";

-- AlterTable
ALTER TABLE "bank_accounts" DROP COLUMN "bankName",
ADD COLUMN     "bankId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "paymentMethod",
ADD COLUMN     "checkIssueDate" TIMESTAMP(3),
ADD COLUMN     "checkNumber" TEXT,
ADD COLUMN     "checkPayerName" TEXT,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "payerClientId" TEXT,
ADD COLUMN     "payerCompanyId" TEXT,
ADD COLUMN     "paymentMethodDefinitionId" TEXT NOT NULL,
ADD COLUMN     "type" "PaymentType" NOT NULL,
ALTER COLUMN "ticketId" DROP NOT NULL,
ALTER COLUMN "paymentDate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ticket_items" DROP COLUMN "discountAmount",
DROP COLUMN "discountPercent",
ADD COLUMN     "appliedPromotionId" TEXT,
ADD COLUMN     "bonoDefinitionId" TEXT,
ADD COLUMN     "consumedBonoInstanceId" TEXT,
ADD COLUMN     "consumedPackageInstanceId" TEXT,
ADD COLUMN     "isPriceOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "originalUnitPrice" DOUBLE PRECISION,
ADD COLUMN     "packageDefinitionId" TEXT,
ADD COLUMN     "professionalUserId" TEXT,
ADD COLUMN     "promotionDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "currencyCode" TEXT NOT NULL,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "originalTicketId" TEXT,
ADD COLUMN     "type" "TicketType" NOT NULL DEFAULT 'SALE';

-- DropEnum
DROP TYPE "PaymentMethod";

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "details" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "payment_method_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceSeries" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT,
    "companyId" TEXT,
    "supplierCompanyId" TEXT,
    "emitterFiscalName" TEXT,
    "emitterTaxId" TEXT,
    "emitterAddress" TEXT,
    "receiverFiscalName" TEXT,
    "receiverTaxId" TEXT,
    "receiverAddress" TEXT,
    "currencyCode" TEXT NOT NULL,
    "subtotalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "ticketId" TEXT,
    "originalInvoiceId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productId" TEXT,
    "serviceId" TEXT,
    "vatRateId" TEXT,
    "vatPercentage" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_instances" (
    "id" TEXT NOT NULL,
    "packageDefinitionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purchaseTicketItemId" TEXT,
    "remainingItems" JSONB NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "banks_systemId_idx" ON "banks"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "banks_name_systemId_key" ON "banks"("name", "systemId");

-- CreateIndex
CREATE INDEX "payment_method_definitions_systemId_idx" ON "payment_method_definitions"("systemId");

-- CreateIndex
CREATE INDEX "payment_method_definitions_type_idx" ON "payment_method_definitions"("type");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_definitions_name_systemId_key" ON "payment_method_definitions"("name", "systemId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_ticketId_key" ON "invoices"("ticketId");

-- CreateIndex
CREATE INDEX "invoices_type_idx" ON "invoices"("type");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");

-- CreateIndex
CREATE INDEX "invoices_clientId_idx" ON "invoices"("clientId");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");

-- CreateIndex
CREATE INDEX "invoices_supplierCompanyId_idx" ON "invoices"("supplierCompanyId");

-- CreateIndex
CREATE INDEX "invoices_ticketId_idx" ON "invoices"("ticketId");

-- CreateIndex
CREATE INDEX "invoices_originalInvoiceId_idx" ON "invoices"("originalInvoiceId");

-- CreateIndex
CREATE INDEX "invoices_systemId_idx" ON "invoices"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceSeries_invoiceNumber_systemId_key" ON "invoices"("invoiceSeries", "invoiceNumber", "systemId");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_items_productId_idx" ON "invoice_items"("productId");

-- CreateIndex
CREATE INDEX "invoice_items_serviceId_idx" ON "invoice_items"("serviceId");

-- CreateIndex
CREATE INDEX "invoice_items_vatRateId_idx" ON "invoice_items"("vatRateId");

-- CreateIndex
CREATE UNIQUE INDEX "package_instances_purchaseTicketItemId_key" ON "package_instances"("purchaseTicketItemId");

-- CreateIndex
CREATE INDEX "package_instances_clientId_idx" ON "package_instances"("clientId");

-- CreateIndex
CREATE INDEX "package_instances_packageDefinitionId_idx" ON "package_instances"("packageDefinitionId");

-- CreateIndex
CREATE INDEX "package_instances_systemId_idx" ON "package_instances"("systemId");

-- CreateIndex
CREATE INDEX "package_instances_purchaseTicketItemId_idx" ON "package_instances"("purchaseTicketItemId");

-- CreateIndex
CREATE INDEX "bank_accounts_bankId_idx" ON "bank_accounts"("bankId");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_paymentMethodDefinitionId_idx" ON "payments"("paymentMethodDefinitionId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_payerClientId_idx" ON "payments"("payerClientId");

-- CreateIndex
CREATE INDEX "payments_payerCompanyId_idx" ON "payments"("payerCompanyId");

-- CreateIndex
CREATE INDEX "ticket_items_bonoDefinitionId_idx" ON "ticket_items"("bonoDefinitionId");

-- CreateIndex
CREATE INDEX "ticket_items_packageDefinitionId_idx" ON "ticket_items"("packageDefinitionId");

-- CreateIndex
CREATE INDEX "ticket_items_consumedBonoInstanceId_idx" ON "ticket_items"("consumedBonoInstanceId");

-- CreateIndex
CREATE INDEX "ticket_items_consumedPackageInstanceId_idx" ON "ticket_items"("consumedPackageInstanceId");

-- CreateIndex
CREATE INDEX "ticket_items_appliedPromotionId_idx" ON "ticket_items"("appliedPromotionId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_invoiceId_key" ON "tickets"("invoiceId");

-- CreateIndex
CREATE INDEX "tickets_type_idx" ON "tickets"("type");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_originalTicketId_idx" ON "tickets"("originalTicketId");

-- CreateIndex
CREATE INDEX "tickets_invoiceId_idx" ON "tickets"("invoiceId");
