-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone1CountryIsoCode" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "phone2CountryIsoCode" TEXT;

-- CreateIndex
CREATE INDEX "users_phone1CountryIsoCode_idx" ON "users"("phone1CountryIsoCode");

-- CreateIndex
CREATE INDEX "users_phone2CountryIsoCode_idx" ON "users"("phone2CountryIsoCode");
