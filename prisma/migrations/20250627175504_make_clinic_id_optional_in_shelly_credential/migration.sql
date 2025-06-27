/*
  Warnings:

  - A unique constraint covering the columns `[email,systemId]` on the table `shelly_credentials` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "shelly_credentials_email_clinicId_key";

-- AlterTable
ALTER TABLE "shelly_credentials" ALTER COLUMN "clinicId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "shelly_credentials_email_systemId_key" ON "shelly_credentials"("email", "systemId");
