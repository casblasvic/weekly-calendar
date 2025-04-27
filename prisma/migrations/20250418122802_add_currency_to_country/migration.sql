/*
  Warnings:

  - Added the required column `currencyCode` to the `country_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyName` to the `country_info` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencySymbol` to the `country_info` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "country_info" ADD COLUMN     "currencyCode" TEXT NOT NULL,
ADD COLUMN     "currencyName" TEXT NOT NULL,
ADD COLUMN     "currencySymbol" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "country_info_currencyCode_idx" ON "country_info"("currencyCode");
