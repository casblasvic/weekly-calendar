/*
  Warnings:

  - You are about to drop the column `expectedBankTransfer` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedCard` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedCheck` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedDeferred` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedInternalCredit` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedOther` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `ticketsCount` on the `cash_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cash_sessions" DROP COLUMN "expectedBankTransfer",
DROP COLUMN "expectedCard",
DROP COLUMN "expectedCheck",
DROP COLUMN "expectedDeferred",
DROP COLUMN "expectedInternalCredit",
DROP COLUMN "expectedOther",
DROP COLUMN "ticketsCount";
