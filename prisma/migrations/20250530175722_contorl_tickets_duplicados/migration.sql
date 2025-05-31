/*
  Warnings:

  - A unique constraint covering the columns `[ticketNumber,clinicId,systemId]` on the table `tickets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "tickets_ticketNumber_systemId_key";

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_clinicId_systemId_key" ON "tickets"("ticketNumber", "clinicId", "systemId");
