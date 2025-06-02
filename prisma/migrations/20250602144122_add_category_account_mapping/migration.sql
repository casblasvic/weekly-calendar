-- CreateTable
CREATE TABLE "category_account_mappings" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "appliesToServices" BOOLEAN NOT NULL DEFAULT true,
    "appliesToProducts" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_account_mappings_legalEntityId_idx" ON "category_account_mappings"("legalEntityId");

-- CreateIndex
CREATE INDEX "category_account_mappings_systemId_idx" ON "category_account_mappings"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "category_account_mappings_categoryId_legalEntityId_key" ON "category_account_mappings"("categoryId", "legalEntityId");
