-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SERVICE', 'PRODUCT', 'MIXED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "type" "CategoryType" NOT NULL DEFAULT 'MIXED';
