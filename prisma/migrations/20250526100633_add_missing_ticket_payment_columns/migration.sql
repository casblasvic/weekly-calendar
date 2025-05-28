/*
  Warnings:

  - Changed the type of `itemType` on the `ticket_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TicketItemType" AS ENUM ('SERVICE', 'PRODUCT', 'BONO_DEFINITION', 'PACKAGE_DEFINITION', 'DEBT_LIQUIDATION', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "ticket_items" DROP COLUMN "itemType",
ADD COLUMN     "itemType" "TicketItemType" NOT NULL;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pendingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
