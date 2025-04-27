/*
  Warnings:

  - You are about to drop the column `languageIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `languageIsoCode` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "clinics_languageIsoCode_idx";

-- DropIndex
DROP INDEX "users_languageIsoCode_idx";

-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "languageIsoCode",
ADD COLUMN     "phone1CountryIsoCode" TEXT,
ADD COLUMN     "phone2CountryIsoCode" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "languageIsoCode",
ADD COLUMN     "phone1CountryIsoCode" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "phone2CountryIsoCode" TEXT;

-- CreateIndex
CREATE INDEX "clinics_phone1CountryIsoCode_idx" ON "clinics"("phone1CountryIsoCode");

-- CreateIndex
CREATE INDEX "clinics_phone2CountryIsoCode_idx" ON "clinics"("phone2CountryIsoCode");

-- CreateIndex
CREATE INDEX "users_phone1CountryIsoCode_idx" ON "users"("phone1CountryIsoCode");

-- CreateIndex
CREATE INDEX "users_phone2CountryIsoCode_idx" ON "users"("phone2CountryIsoCode");
