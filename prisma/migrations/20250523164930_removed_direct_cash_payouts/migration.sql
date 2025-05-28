/*
  Warnings:

  - You are about to drop the column `directCashPayouts` on the `cash_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cash_sessions" DROP COLUMN "directCashPayouts";
