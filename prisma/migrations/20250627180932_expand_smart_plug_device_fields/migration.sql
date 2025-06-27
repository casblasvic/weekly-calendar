-- AlterTable
ALTER TABLE "SmartPlugDevice" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "current" DOUBLE PRECISION,
ADD COLUMN     "currentPower" DOUBLE PRECISION,
ADD COLUMN     "firmwareVersion" TEXT,
ADD COLUMN     "generation" TEXT,
ADD COLUMN     "hasUpdate" BOOLEAN,
ADD COLUMN     "macAddress" TEXT,
ADD COLUMN     "modelCode" TEXT,
ADD COLUMN     "rawData" JSONB,
ADD COLUMN     "relaySource" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION,
ADD COLUMN     "totalEnergy" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "voltage" DOUBLE PRECISION,
ADD COLUMN     "wifiRssi" INTEGER,
ADD COLUMN     "wifiSsid" TEXT,
ALTER COLUMN "deviceIp" DROP NOT NULL,
ALTER COLUMN "equipmentId" DROP NOT NULL,
ALTER COLUMN "clinicId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "SmartPlugDevice_systemId_idx" ON "SmartPlugDevice"("systemId");

-- CreateIndex
CREATE INDEX "SmartPlugDevice_clinicId_idx" ON "SmartPlugDevice"("clinicId");

-- CreateIndex
CREATE INDEX "SmartPlugDevice_online_idx" ON "SmartPlugDevice"("online");

-- CreateIndex
CREATE INDEX "SmartPlugDevice_modelCode_idx" ON "SmartPlugDevice"("modelCode");
