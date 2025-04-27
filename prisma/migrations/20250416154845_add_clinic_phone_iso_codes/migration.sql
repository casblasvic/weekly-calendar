-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "phone1CountryIsoCode" TEXT,
ADD COLUMN     "phone2CountryIsoCode" TEXT;

-- CreateIndex
CREATE INDEX "clinics_phone1CountryIsoCode_idx" ON "clinics"("phone1CountryIsoCode");

-- CreateIndex
CREATE INDEX "clinics_phone2CountryIsoCode_idx" ON "clinics"("phone2CountryIsoCode");
