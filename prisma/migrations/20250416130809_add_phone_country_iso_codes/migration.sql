/*
  Warnings:

  - You are about to drop the column `phone2` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone2CountryIsoCode` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_phone2CountryIsoCode_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phone2",
DROP COLUMN "phone2CountryIsoCode";
