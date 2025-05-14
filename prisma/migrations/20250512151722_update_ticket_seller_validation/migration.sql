/*
  Warnings:

  - You are about to drop the column `discountAmount` on the `tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ticket_items" ADD COLUMN     "discountNotes" TEXT,
ADD COLUMN     "isValidationGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "discountAmount",
ADD COLUMN     "sellerUserId" TEXT,
ADD COLUMN     "ticketSeries" TEXT;

-- CreateIndex
CREATE INDEX "ticket_items_isValidationGenerated_idx" ON "ticket_items"("isValidationGenerated");

-- CreateIndex
CREATE INDEX "tickets_sellerUserId_idx" ON "tickets"("sellerUserId");

-- CreateIndex
CREATE INDEX "tickets_ticketSeries_idx" ON "tickets"("ticketSeries");
