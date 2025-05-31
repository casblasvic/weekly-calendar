-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "legal_entity_id" TEXT;

-- CreateTable
CREATE TABLE "legal_entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullAddress" TEXT,
    "countryIsoCode" TEXT NOT NULL,
    "taxIdentifierFields" JSONB,
    "notes" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_entities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_entities_systemId_idx" ON "legal_entities"("systemId");

-- CreateIndex
CREATE INDEX "legal_entities_countryIsoCode_idx" ON "legal_entities"("countryIsoCode");

-- CreateIndex
CREATE INDEX "clinics_legal_entity_id_idx" ON "clinics"("legal_entity_id");
