/*
  Warnings:

  - A unique constraint covering the columns `[legalEntityId,systemId,accountNumber]` on the table `chart_of_account_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "chart_of_account_entries" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_entries_legalEntityId_systemId_accountNumb_key" ON "chart_of_account_entries"("legalEntityId", "systemId", "accountNumber");
