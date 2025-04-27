/*
  Warnings:

  - You are about to drop the `PaymentMethodDefinition` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "PaymentMethodDefinition";

-- CreateTable
CREATE TABLE "payment_method_definitions" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "details" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_method_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_method_definitions_systemId_idx" ON "payment_method_definitions"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_definitions_name_systemId_key" ON "payment_method_definitions"("name", "systemId");
