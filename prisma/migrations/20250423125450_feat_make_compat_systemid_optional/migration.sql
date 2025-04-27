-- AlterTable
ALTER TABLE "promotion_compatibilities" ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE INDEX "promotion_compatibilities_systemId_idx" ON "promotion_compatibilities"("systemId");
