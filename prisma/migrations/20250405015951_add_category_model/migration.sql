-- AlterTable
ALTER TABLE "products" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_systemId_idx" ON "categories"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_systemId_key" ON "categories"("name", "systemId");
