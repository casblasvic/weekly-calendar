-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "bono_instances" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "client_relations" ADD COLUMN     "personAId" TEXT,
ADD COLUMN     "personBId" TEXT;

-- AlterTable
ALTER TABLE "debt_ledgers" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "loyalty_ledgers" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "package_instances" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payerPersonId" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "personId" TEXT;

-- AlterTable
ALTER TABLE "time_logs" ADD COLUMN     "personId" TEXT;

-- CreateTable
CREATE TABLE "entity_relations" (
    "id" TEXT NOT NULL,
    "entityAType" TEXT NOT NULL,
    "entityAId" TEXT NOT NULL,
    "entityBType" TEXT NOT NULL,
    "entityBId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "direction" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "entity_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_client_data" (
    "id" TEXT NOT NULL,
    "functionalRoleId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "countryIsoCode" TEXT,
    "phoneCountryIsoCode" TEXT,
    "secondaryPhone" TEXT,
    "secondaryPhoneCountryIsoCode" TEXT,
    "fiscalName" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "originClinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_client_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_relations_entityAId_idx" ON "entity_relations"("entityAId");

-- CreateIndex
CREATE INDEX "entity_relations_entityBId_idx" ON "entity_relations"("entityBId");

-- CreateIndex
CREATE INDEX "entity_relations_systemId_idx" ON "entity_relations"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "entity_relations_entityAType_entityAId_entityBType_entityBI_key" ON "entity_relations"("entityAType", "entityAId", "entityBType", "entityBId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "person_client_data_functionalRoleId_key" ON "person_client_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_client_data_functionalRoleId_idx" ON "person_client_data"("functionalRoleId");

-- CreateIndex
CREATE INDEX "person_client_data_companyId_idx" ON "person_client_data"("companyId");

-- CreateIndex
CREATE INDEX "person_client_data_originClinicId_idx" ON "person_client_data"("originClinicId");

-- CreateIndex
CREATE INDEX "appointments_personId_idx" ON "appointments"("personId");

-- CreateIndex
CREATE INDEX "bono_instances_personId_idx" ON "bono_instances"("personId");

-- CreateIndex
CREATE INDEX "client_relations_personAId_idx" ON "client_relations"("personAId");

-- CreateIndex
CREATE INDEX "client_relations_personBId_idx" ON "client_relations"("personBId");

-- CreateIndex
CREATE INDEX "debt_ledgers_personId_idx" ON "debt_ledgers"("personId");

-- CreateIndex
CREATE INDEX "invoices_personId_idx" ON "invoices"("personId");

-- CreateIndex
CREATE INDEX "loyalty_ledgers_personId_idx" ON "loyalty_ledgers"("personId");

-- CreateIndex
CREATE INDEX "package_instances_personId_idx" ON "package_instances"("personId");

-- CreateIndex
CREATE INDEX "payments_payerPersonId_idx" ON "payments"("payerPersonId");

-- CreateIndex
CREATE INDEX "tickets_personId_idx" ON "tickets"("personId");

-- CreateIndex
CREATE INDEX "time_logs_personId_idx" ON "time_logs"("personId");
