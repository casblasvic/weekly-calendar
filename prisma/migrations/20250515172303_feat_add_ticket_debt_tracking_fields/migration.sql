-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "dueAmount" DOUBLE PRECISION,
ADD COLUMN     "hasOpenDebt" BOOLEAN NOT NULL DEFAULT false;
