-- AlterTable
ALTER TABLE "banks" ADD COLUMN     "address" TEXT,
ADD COLUMN     "countryIsoCode" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "clinic_payment_settings" ADD COLUMN     "isDefaultPosTerminal" BOOLEAN DEFAULT false,
ADD COLUMN     "posTerminalId" TEXT;

-- CreateIndex
CREATE INDEX "banks_countryIsoCode_idx" ON "banks"("countryIsoCode");

-- CreateIndex
CREATE INDEX "clinic_payment_settings_posTerminalId_idx" ON "clinic_payment_settings"("posTerminalId");
