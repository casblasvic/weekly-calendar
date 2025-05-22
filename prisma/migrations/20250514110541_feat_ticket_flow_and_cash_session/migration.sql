/*
  Warnings:

  - The values [DRAFT,PAID,PARTIALLY_PAID,REFUNDED,PARTIALLY_REFUNDED] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `closingBalance` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `difference` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `expectedBalance` on the `cash_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `openingBalance` on the `cash_sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[clinicId,sessionNumber,systemId]` on the table `cash_sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `openingBalanceCash` to the `cash_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionNumber` to the `cash_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'CLOSED', 'ACCOUNTED', 'VOID');
ALTER TABLE "tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- DropIndex
DROP INDEX "cash_sessions_openingTime_idx";

-- DropIndex
DROP INDEX "cash_sessions_systemId_idx";

-- AlterTable
ALTER TABLE "cash_sessions" DROP COLUMN "closingBalance",
DROP COLUMN "difference",
DROP COLUMN "expectedBalance",
DROP COLUMN "openingBalance",
ADD COLUMN     "countedBankTransfer" DOUBLE PRECISION,
ADD COLUMN     "countedCard" DOUBLE PRECISION,
ADD COLUMN     "countedCash" DOUBLE PRECISION,
ADD COLUMN     "countedCheck" DOUBLE PRECISION,
ADD COLUMN     "differenceCash" DOUBLE PRECISION,
ADD COLUMN     "expectedCash" DOUBLE PRECISION,
ADD COLUMN     "openingBalanceCash" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "posTerminalId" TEXT,
ADD COLUMN     "reconciliationTime" TIMESTAMP(3),
ADD COLUMN     "sessionNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "cashSessionId" TEXT;

-- CreateIndex
CREATE INDEX "cash_sessions_userId_clinicId_openingTime_idx" ON "cash_sessions"("userId", "clinicId", "openingTime");

-- CreateIndex
CREATE UNIQUE INDEX "cash_sessions_clinicId_sessionNumber_systemId_key" ON "cash_sessions"("clinicId", "sessionNumber", "systemId");

-- CreateIndex
CREATE INDEX "tickets_cashSessionId_idx" ON "tickets"("cashSessionId");
