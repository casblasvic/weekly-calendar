/*
  Warnings:

  - You are about to drop the `DeviceUsageInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceEnergyProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "DeviceUsageInsight";

-- DropTable
DROP TABLE "ServiceEnergyProfile";

-- CreateTable
CREATE TABLE "smart_plug_service_energy_profiles" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "avgKwhPerMin" DOUBLE PRECISION NOT NULL,
    "stdDevKwhPerMin" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_plug_service_energy_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_plug_device_usage_insights" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "deviceUsageId" TEXT,
    "equipmentClinicAssignmentId" TEXT,
    "clientId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insightType" "UsageInsightType" NOT NULL,
    "actualKwh" DOUBLE PRECISION NOT NULL,
    "expectedKwh" DOUBLE PRECISION NOT NULL,
    "deviationPct" DOUBLE PRECISION NOT NULL,
    "detailJson" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "smart_plug_device_usage_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smart_plug_service_energy_profiles_systemId_idx" ON "smart_plug_service_energy_profiles"("systemId");

-- CreateIndex
CREATE INDEX "smart_plug_service_energy_profiles_equipmentId_idx" ON "smart_plug_service_energy_profiles"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "smart_plug_service_energy_profiles_systemId_equipmentId_ser_key" ON "smart_plug_service_energy_profiles"("systemId", "equipmentId", "serviceId");

-- CreateIndex
CREATE INDEX "smart_plug_device_usage_insights_systemId_idx" ON "smart_plug_device_usage_insights"("systemId");

-- CreateIndex
CREATE INDEX "smart_plug_device_usage_insights_appointmentId_idx" ON "smart_plug_device_usage_insights"("appointmentId");

-- CreateIndex
CREATE INDEX "smart_plug_device_usage_insights_insightType_idx" ON "smart_plug_device_usage_insights"("insightType");
