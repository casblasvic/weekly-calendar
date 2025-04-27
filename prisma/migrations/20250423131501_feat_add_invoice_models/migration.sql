/*
  Warnings:

  - The `status` column on the `invoices` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "status",
ADD COLUMN     "status" TEXT;

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
