-- CreateTable
CREATE TABLE "tariff_service_prices" (
    "tariffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vatTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tariff_service_prices_pkey" PRIMARY KEY ("tariffId","serviceId")
);

-- CreateTable
CREATE TABLE "tariff_product_prices" (
    "tariffId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vatTypeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tariff_product_prices_pkey" PRIMARY KEY ("tariffId","productId")
);

-- CreateIndex
CREATE INDEX "tariff_service_prices_serviceId_idx" ON "tariff_service_prices"("serviceId");

-- CreateIndex
CREATE INDEX "tariff_service_prices_vatTypeId_idx" ON "tariff_service_prices"("vatTypeId");

-- CreateIndex
CREATE INDEX "tariff_product_prices_productId_idx" ON "tariff_product_prices"("productId");

-- CreateIndex
CREATE INDEX "tariff_product_prices_vatTypeId_idx" ON "tariff_product_prices"("vatTypeId");
