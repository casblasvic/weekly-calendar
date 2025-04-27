/*
  Warnings:

  - You are about to drop the column `phone1PrefixIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `phone2PrefixIsoCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `phone1PrefixIsoCode` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone2` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone2PrefixIsoCode` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "clinics_phone1PrefixIsoCode_idx";

-- DropIndex
DROP INDEX "clinics_phone2PrefixIsoCode_idx";

-- DropIndex
DROP INDEX "users_phone1PrefixIsoCode_idx";

-- DropIndex
DROP INDEX "users_phone2PrefixIsoCode_idx";

-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "phone1PrefixIsoCode",
DROP COLUMN "phone2PrefixIsoCode",
ADD COLUMN     "languageIsoCode" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone1PrefixIsoCode",
DROP COLUMN "phone2",
DROP COLUMN "phone2PrefixIsoCode",
ADD COLUMN     "languageIsoCode" TEXT,
ALTER COLUMN "lastName" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "clinics_languageIsoCode_idx" ON "clinics"("languageIsoCode");

-- CreateIndex
CREATE INDEX "users_languageIsoCode_idx" ON "users"("languageIsoCode");
