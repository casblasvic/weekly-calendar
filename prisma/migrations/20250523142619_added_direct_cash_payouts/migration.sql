/*
  Warnings:

  - You are about to alter the column `cashWithdrawals` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `manualCashInput` on the `cash_sessions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "cash_sessions" ADD COLUMN     "directCashPayouts" DECIMAL(65,30) DEFAULT 0,
ALTER COLUMN "cashWithdrawals" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "manualCashInput" SET DATA TYPE DECIMAL(65,30);
