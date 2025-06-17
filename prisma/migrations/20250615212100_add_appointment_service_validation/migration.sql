/*
  Warnings:

  - You are about to drop the column `clientId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `employment_contracts` table. All the data in the column will be lost.
  - You are about to drop the column `payerClientId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `client_relations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `contact_persons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leads` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `personId` on table `appointments` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AppointmentServiceStatus" AS ENUM ('SCHEDULED', 'VALIDATED', 'CANCELLED', 'NO_SHOW');

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'TARIFA';

-- DropIndex
DROP INDEX "appointments_clientId_idx";

-- DropIndex
DROP INDEX "employment_contracts_clientId_idx";

-- DropIndex
DROP INDEX "payments_payerClientId_idx";

-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "clientId",
ALTER COLUMN "personId" SET NOT NULL;

-- AlterTable
ALTER TABLE "employment_contracts" DROP COLUMN "clientId";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payerClientId";

-- DropTable
DROP TABLE "client_relations";

-- DropTable
DROP TABLE "clients";

-- DropTable
DROP TABLE "contact_persons";

-- DropTable
DROP TABLE "leads";

-- CreateTable
CREATE TABLE "appointment_services" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "AppointmentServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedDuration" INTEGER,
    "notes" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedByUserId" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_services_appointmentId_idx" ON "appointment_services"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_services_serviceId_idx" ON "appointment_services"("serviceId");

-- CreateIndex
CREATE INDEX "appointment_services_status_idx" ON "appointment_services"("status");

-- CreateIndex
CREATE INDEX "appointment_services_validatedAt_idx" ON "appointment_services"("validatedAt");

-- CreateIndex
CREATE INDEX "appointment_services_validatedByUserId_idx" ON "appointment_services"("validatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_services_appointmentId_serviceId_key" ON "appointment_services"("appointmentId", "serviceId");
