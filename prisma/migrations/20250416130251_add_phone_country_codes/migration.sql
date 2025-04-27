/*
  Warnings:

  - You are about to drop the column `phone1CountryIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `phone1CountryIsoCode` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "clinics_phone1CountryIsoCode_idx";

-- DropIndex
DROP INDEX "users_phone1CountryIsoCode_idx";

-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "phone1CountryIsoCode",
ADD COLUMN     "languageIsoCode" TEXT,
ADD COLUMN     "phoneCountryIsoCode" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone1CountryIsoCode",
ADD COLUMN     "languageIsoCode" TEXT,
ADD COLUMN     "phoneCountryIsoCode" TEXT;

-- CreateIndex
CREATE INDEX "clinics_languageIsoCode_idx" ON "clinics"("languageIsoCode");

-- CreateIndex
CREATE INDEX "clinics_phoneCountryIsoCode_idx" ON "clinics"("phoneCountryIsoCode");

-- CreateIndex
CREATE INDEX "users_languageIsoCode_idx" ON "users"("languageIsoCode");

-- CreateIndex
CREATE INDEX "users_phoneCountryIsoCode_idx" ON "users"("phoneCountryIsoCode");
