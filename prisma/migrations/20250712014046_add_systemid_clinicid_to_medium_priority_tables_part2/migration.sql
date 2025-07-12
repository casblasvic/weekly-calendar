-- AlterTable
ALTER TABLE "PaymentVerification" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "chart_of_account_template_entries" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "chart_of_account_template_versions" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "journal_entry_lines" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "person_client_data" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "person_contact_data" ADD COLUMN     "systemId" TEXT;

-- AlterTable
ALTER TABLE "person_lead_data" ADD COLUMN     "systemId" TEXT;

-- CreateIndex
CREATE INDEX "PaymentVerification_systemId_idx" ON "PaymentVerification"("systemId");

-- CreateIndex
CREATE INDEX "chart_of_account_template_entries_systemId_idx" ON "chart_of_account_template_entries"("systemId");

-- CreateIndex
CREATE INDEX "chart_of_account_template_versions_systemId_idx" ON "chart_of_account_template_versions"("systemId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_systemId_idx" ON "journal_entry_lines"("systemId");

-- CreateIndex
CREATE INDEX "person_client_data_systemId_idx" ON "person_client_data"("systemId");

-- CreateIndex
CREATE INDEX "person_contact_data_systemId_idx" ON "person_contact_data"("systemId");

-- CreateIndex
CREATE INDEX "person_lead_data_systemId_idx" ON "person_lead_data"("systemId");
