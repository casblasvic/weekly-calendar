-- AlterTable
ALTER TABLE "cash_sessions" ADD COLUMN     "cashWithdrawals" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "manualCashInput" DOUBLE PRECISION DEFAULT 0;
