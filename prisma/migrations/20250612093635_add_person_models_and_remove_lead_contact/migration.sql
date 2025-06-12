/*
  Warnings:

  - You are about to drop the column `assignedToUserId` on the `opportunities` table. All the data in the column will be lost.
  - You are about to drop the column `expectedCloseDate` on the `opportunities` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `opportunities` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `opportunities` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `opportunities` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `opportunities` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `opportunities` table. All the data in the column will be lost.
  - The `stage` column on the `opportunities` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `person_lead_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `dataProcessingConsent` on the `persons` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `persons` table. All the data in the column will be lost.
  - You are about to drop the column `marketingConsent` on the `persons` table. All the data in the column will be lost.
  - You are about to drop the column `phoneCountryIsoCode` on the `persons` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryPhone` on the `persons` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryPhoneCountryIsoCode` on the `persons` table. All the data in the column will be lost.
  - You are about to drop the `entity_relations` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `clinicId` to the `opportunities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadDataId` to the `opportunities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `opportunities` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `roleType` on the `person_functional_roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "opportunities_assignedToUserId_idx";

-- DropIndex
DROP INDEX "opportunities_personId_idx";

-- DropIndex
DROP INDEX "opportunities_stage_idx";

-- DropIndex
DROP INDEX "person_functional_roles_roleType_idx";

-- DropIndex
DROP INDEX "person_lead_data_status_idx";

-- DropIndex
DROP INDEX "persons_lastName_idx";

-- AlterTable
ALTER TABLE "opportunities" DROP COLUMN "assignedToUserId",
DROP COLUMN "expectedCloseDate",
DROP COLUMN "isActive",
DROP COLUMN "personId",
DROP COLUMN "source",
DROP COLUMN "title",
DROP COLUMN "value",
ADD COLUMN     "clinicId" TEXT NOT NULL,
ADD COLUMN     "estimatedCloseDate" TIMESTAMP(3),
ADD COLUMN     "estimatedValue" DOUBLE PRECISION,
ADD COLUMN     "leadDataId" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "wonLostReason" TEXT,
ALTER COLUMN "probability" DROP NOT NULL,
ALTER COLUMN "probability" DROP DEFAULT,
ALTER COLUMN "probability" SET DATA TYPE DOUBLE PRECISION,
DROP COLUMN "stage",
ADD COLUMN     "stage" TEXT NOT NULL DEFAULT 'PROSPECTING';

-- AlterTable
ALTER TABLE "person_contact_data" ADD COLUMN     "department" TEXT,
ADD COLUMN     "preferredContactMethod" TEXT;

-- AlterTable
ALTER TABLE "person_functional_roles" DROP COLUMN "roleType",
ADD COLUMN     "roleType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "person_lead_data" ADD COLUMN     "conversionDate" TIMESTAMP(3),
ADD COLUMN     "conversionToRole" TEXT,
ADD COLUMN     "estimatedValue" DOUBLE PRECISION,
ADD COLUMN     "interests" TEXT,
ADD COLUMN     "lastContactDate" TIMESTAMP(3),
ADD COLUMN     "nextFollowUpDate" TIMESTAMP(3),
ADD COLUMN     "priority" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "persons" DROP COLUMN "dataProcessingConsent",
DROP COLUMN "isActive",
DROP COLUMN "marketingConsent",
DROP COLUMN "phoneCountryIsoCode",
DROP COLUMN "secondaryPhone",
DROP COLUMN "secondaryPhoneCountryIsoCode",
ADD COLUMN     "nationalIdType" TEXT,
ADD COLUMN     "passportCountry" TEXT,
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "stateProvince" TEXT,
ADD COLUMN     "taxId" TEXT;

-- DropTable
DROP TABLE "entity_relations";

-- DropEnum
DROP TYPE "OpportunityStage";

-- DropEnum
DROP TYPE "PersonRoleType";

-- CreateTable
CREATE TABLE "contact_persons" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "assignedToUserId" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_persons_companyId_idx" ON "contact_persons"("companyId");

-- CreateIndex
CREATE INDEX "contact_persons_systemId_idx" ON "contact_persons"("systemId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_assignedToUserId_idx" ON "leads"("assignedToUserId");

-- CreateIndex
CREATE INDEX "leads_systemId_idx" ON "leads"("systemId");

-- CreateIndex
CREATE INDEX "leads_companyId_idx" ON "leads"("companyId");

-- CreateIndex
CREATE INDEX "opportunities_leadDataId_idx" ON "opportunities"("leadDataId");

-- CreateIndex
CREATE INDEX "opportunities_clinicId_idx" ON "opportunities"("clinicId");

-- CreateIndex
CREATE INDEX "person_contact_data_functionalRoleId_idx" ON "person_contact_data"("functionalRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "person_functional_roles_personId_roleType_key" ON "person_functional_roles"("personId", "roleType");

-- CreateIndex
CREATE INDEX "person_lead_data_functionalRoleId_idx" ON "person_lead_data"("functionalRoleId");
