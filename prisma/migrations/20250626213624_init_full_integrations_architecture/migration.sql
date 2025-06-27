-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('AUTOMATION', 'MARKETING', 'COMMUNICATION', 'PAYMENTS', 'ACCOUNTING', 'IOT_DEVICES');

-- CreateTable
CREATE TABLE "IntegrationModule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "category" "IntegrationCategory" NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IntegrationModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIntegration" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "SystemIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceIp" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "SmartDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationModule_name_key" ON "IntegrationModule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SystemIntegration_systemId_moduleId_key" ON "SystemIntegration"("systemId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartDevice_equipmentId_key" ON "SmartDevice"("equipmentId");
