-- AlterTable
ALTER TABLE "cash_sessions" ADD COLUMN     "expectedBankTransfer" DOUBLE PRECISION,
ADD COLUMN     "expectedCard" DOUBLE PRECISION,
ADD COLUMN     "expectedCheck" DOUBLE PRECISION,
ADD COLUMN     "expectedDeferred" DOUBLE PRECISION,
ADD COLUMN     "expectedInternalCredit" DOUBLE PRECISION,
ADD COLUMN     "expectedOther" JSONB;
