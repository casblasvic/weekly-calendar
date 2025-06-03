-- CreateTable
CREATE TABLE "expense_type_account_mappings" (
    "id" TEXT NOT NULL,
    "expenseTypeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_type_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_session_account_mappings" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "posTerminalId" TEXT,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_session_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_type_account_mappings" (
    "id" TEXT NOT NULL,
    "discountTypeCode" TEXT NOT NULL,
    "discountTypeName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_type_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_type_account_mappings_legalEntityId_idx" ON "expense_type_account_mappings"("legalEntityId");

-- CreateIndex
CREATE INDEX "expense_type_account_mappings_systemId_idx" ON "expense_type_account_mappings"("systemId");

-- CreateIndex
CREATE INDEX "expense_type_account_mappings_accountId_idx" ON "expense_type_account_mappings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_type_account_mappings_expenseTypeId_legalEntityId_key" ON "expense_type_account_mappings"("expenseTypeId", "legalEntityId");

-- CreateIndex
CREATE INDEX "cash_session_account_mappings_legalEntityId_idx" ON "cash_session_account_mappings"("legalEntityId");

-- CreateIndex
CREATE INDEX "cash_session_account_mappings_systemId_idx" ON "cash_session_account_mappings"("systemId");

-- CreateIndex
CREATE INDEX "cash_session_account_mappings_accountId_idx" ON "cash_session_account_mappings"("accountId");

-- CreateIndex
CREATE INDEX "cash_session_account_mappings_clinicId_idx" ON "cash_session_account_mappings"("clinicId");

-- CreateIndex
CREATE INDEX "cash_session_account_mappings_posTerminalId_idx" ON "cash_session_account_mappings"("posTerminalId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_session_account_mappings_clinicId_posTerminalId_legalE_key" ON "cash_session_account_mappings"("clinicId", "posTerminalId", "legalEntityId");

-- CreateIndex
CREATE INDEX "discount_type_account_mappings_legalEntityId_idx" ON "discount_type_account_mappings"("legalEntityId");

-- CreateIndex
CREATE INDEX "discount_type_account_mappings_systemId_idx" ON "discount_type_account_mappings"("systemId");

-- CreateIndex
CREATE INDEX "discount_type_account_mappings_accountId_idx" ON "discount_type_account_mappings"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "discount_type_account_mappings_discountTypeCode_legalEntity_key" ON "discount_type_account_mappings"("discountTypeCode", "legalEntityId");

-- CreateIndex
CREATE INDEX "expense_types_systemId_idx" ON "expense_types"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_types_code_systemId_key" ON "expense_types"("code", "systemId");
