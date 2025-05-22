-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "discountAmount" DOUBLE PRECISION,
ADD COLUMN     "discountReason" TEXT,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "returnReason" TEXT,
ALTER COLUMN "currencyCode" SET DEFAULT 'EUR';
