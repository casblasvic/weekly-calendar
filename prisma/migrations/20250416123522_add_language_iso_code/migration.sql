/*
  Warnings:

  - You are about to drop the column `phoneCode` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "languageIsoCode" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "phoneCode",
ADD COLUMN     "languageIsoCode" TEXT;

-- CreateIndex
CREATE INDEX "clinics_languageIsoCode_idx" ON "clinics"("languageIsoCode");

-- CreateIndex
CREATE INDEX "users_languageIsoCode_idx" ON "users"("languageIsoCode");
