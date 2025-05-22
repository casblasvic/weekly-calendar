/*
  Warnings:

  - A unique constraint covering the columns `[code,systemId]` on the table `payment_method_definitions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PaymentMethodType" ADD VALUE 'DEFERRED_PAYMENT';

-- AlterTable
ALTER TABLE "payment_method_definitions" ADD COLUMN     "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_definitions_code_systemId_key" ON "payment_method_definitions"("code", "systemId");
