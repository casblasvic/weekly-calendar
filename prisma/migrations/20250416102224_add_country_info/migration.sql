/*
  Warnings:

  - You are about to drop the column `country` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `countryCode` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `timezone` on the `clinics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "country",
DROP COLUMN "countryCode",
DROP COLUMN "timezone",
ADD COLUMN     "countryIsoCode" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "countryIsoCode" TEXT;

-- CreateTable
CREATE TABLE "country_info" (
    "isoCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "phoneCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_info_pkey" PRIMARY KEY ("isoCode")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_info_isoCode_key" ON "country_info"("isoCode");

-- CreateIndex
CREATE INDEX "clinics_countryIsoCode_idx" ON "clinics"("countryIsoCode");

-- CreateIndex
CREATE INDEX "users_countryIsoCode_idx" ON "users"("countryIsoCode");
