/*
  Warnings:

  - You are about to drop the column `clientId` on the `bono_instances` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `debt_ledgers` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `loyalty_ledgers` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `package_instances` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `time_logs` table. All the data in the column will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `personId` on table `debt_ledgers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `personId` on table `loyalty_ledgers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "bono_instances_clientId_idx";

-- DropIndex
DROP INDEX "debt_ledgers_clientId_idx";

-- DropIndex
DROP INDEX "invoices_clientId_idx";

-- DropIndex
DROP INDEX "loyalty_ledgers_clientId_idx";

-- DropIndex
DROP INDEX "package_instances_clientId_idx";

-- DropIndex
DROP INDEX "tickets_clientId_idx";

-- DropIndex
DROP INDEX "time_logs_clientId_idx";

-- AlterTable
ALTER TABLE "bono_instances" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "debt_ledgers" DROP COLUMN "clientId",
ALTER COLUMN "personId" SET NOT NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "loyalty_ledgers" DROP COLUMN "clientId",
ALTER COLUMN "personId" SET NOT NULL;

-- AlterTable
ALTER TABLE "package_instances" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "time_logs" DROP COLUMN "clientId";

-- DropTable
DROP TABLE "Client";

-- CreateTable
CREATE TABLE "clients" (
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

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_systemId_idx" ON "clients"("systemId");

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE INDEX "clients_countryIsoCode_idx" ON "clients"("countryIsoCode");

-- CreateIndex
CREATE INDEX "clients_lastName_idx" ON "clients"("lastName");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "clients_phone_idx" ON "clients"("phone");

-- CreateIndex
CREATE INDEX "clients_originClinicId_idx" ON "clients"("originClinicId");
