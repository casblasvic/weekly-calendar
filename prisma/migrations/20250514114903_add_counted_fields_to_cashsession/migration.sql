-- AlterTable
ALTER TABLE "cash_sessions" ADD COLUMN     "countedInternalCredit" DOUBLE PRECISION,
ADD COLUMN     "countedOther" JSONB;
