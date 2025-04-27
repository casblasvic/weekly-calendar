/*
  Warnings:

  - You are about to drop the column `languageCode` on the `country_info` table. All the data in the column will be lost.
  - You are about to drop the column `languageName` on the `country_info` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "country_info" DROP COLUMN "languageCode",
DROP COLUMN "languageName";
