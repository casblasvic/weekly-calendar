-- AlterTable
ALTER TABLE "chart_of_account_entries" ADD COLUMN     "defaultForProducts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultForServices" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ifrsCode" TEXT,
ADD COLUMN     "localCode" TEXT,
ADD COLUMN     "names" JSONB,
ADD COLUMN     "productCategories" TEXT[],
ADD COLUMN     "serviceCategories" TEXT[],
ADD COLUMN     "vatCategory" TEXT;

-- CreateTable
CREATE TABLE "chart_of_account_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "description" JSONB,
    "level" INTEGER NOT NULL,
    "countryIso" TEXT,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "baseTemplateCode" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_account_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_account_template_entries" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "type" "AccountType" NOT NULL,
    "description" JSONB,
    "isMonetary" BOOLEAN NOT NULL DEFAULT true,
    "allowsDirectEntry" BOOLEAN NOT NULL DEFAULT true,
    "level" INTEGER NOT NULL DEFAULT 0,
    "parentNumber" TEXT,
    "ifrsCode" TEXT,
    "localCode" TEXT,
    "vatCategory" TEXT,
    "defaultForServices" BOOLEAN NOT NULL DEFAULT false,
    "defaultForProducts" BOOLEAN NOT NULL DEFAULT false,
    "serviceCategories" TEXT[],
    "productCategories" TEXT[],

    CONSTRAINT "chart_of_account_template_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_account_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_of_account_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "ticketId" TEXT,
    "invoiceId" TEXT,
    "cashSessionId" TEXT,
    "paymentId" TEXT,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL,
    "credit" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "vatAmount" DECIMAL(15,2),
    "vatRate" DECIMAL(5,2),
    "costCenterId" TEXT,
    "projectId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_account_mappings" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "service_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_account_mappings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "product_account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chart_of_account_templates_level_countryIso_idx" ON "chart_of_account_templates"("level", "countryIso");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_templates_code_systemId_key" ON "chart_of_account_templates"("code", "systemId");

-- CreateIndex
CREATE INDEX "chart_of_account_template_entries_templateId_idx" ON "chart_of_account_template_entries"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_template_entries_templateId_accountNumber_key" ON "chart_of_account_template_entries"("templateId", "accountNumber");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_ticketId_idx" ON "journal_entries"("ticketId");

-- CreateIndex
CREATE INDEX "journal_entries_invoiceId_idx" ON "journal_entries"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entryNumber_legalEntityId_key" ON "journal_entries"("entryNumber", "legalEntityId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_journalEntryId_idx" ON "journal_entry_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_accountId_idx" ON "journal_entry_lines"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "service_account_mappings_serviceId_legalEntityId_key" ON "service_account_mappings"("serviceId", "legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "product_account_mappings_productId_legalEntityId_key" ON "product_account_mappings"("productId", "legalEntityId");

-- CreateIndex
CREATE INDEX "chart_of_account_entries_ifrsCode_idx" ON "chart_of_account_entries"("ifrsCode");

-- CreateIndex
CREATE INDEX "chart_of_account_entries_localCode_idx" ON "chart_of_account_entries"("localCode");
