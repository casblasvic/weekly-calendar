/*
  Warnings:

  - You are about to drop the column `languageIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `phone2CountryIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `phoneCountryIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `languageIsoCode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phoneCountryIsoCode` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "clinics_languageIsoCode_idx";

-- DropIndex
DROP INDEX "clinics_phone2CountryIsoCode_idx";

-- DropIndex
DROP INDEX "clinics_phoneCountryIsoCode_idx";

-- DropIndex
DROP INDEX "users_languageIsoCode_idx";

-- DropIndex
DROP INDEX "users_phoneCountryIsoCode_idx";

-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "languageIsoCode",
DROP COLUMN "phone2CountryIsoCode",
DROP COLUMN "phoneCountryIsoCode",
ADD COLUMN     "phone1PrefixIsoCode" TEXT,
ADD COLUMN     "phone2PrefixIsoCode" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "languageIsoCode",
DROP COLUMN "phoneCountryIsoCode",
ADD COLUMN     "phone1PrefixIsoCode" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "phone2PrefixIsoCode" TEXT;

-- CreateIndex
CREATE INDEX "clinics_phone1PrefixIsoCode_idx" ON "clinics"("phone1PrefixIsoCode");

-- CreateIndex
CREATE INDEX "clinics_phone2PrefixIsoCode_idx" ON "clinics"("phone2PrefixIsoCode");

-- CreateIndex
CREATE INDEX "users_phone1PrefixIsoCode_idx" ON "users"("phone1PrefixIsoCode");

-- CreateIndex
CREATE INDEX "users_phone2PrefixIsoCode_idx" ON "users"("phone2PrefixIsoCode");
