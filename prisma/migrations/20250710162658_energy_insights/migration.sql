-- CreateEnum
CREATE TYPE "UsageInsightType" AS ENUM ('OVER_CONSUMPTION', 'UNDER_CONSUMPTION', 'POWER_ANOMALY');

-- CreateTable
CREATE TABLE "ServiceEnergyProfile" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "avgKwhPerMin" DOUBLE PRECISION NOT NULL,
    "stdDevKwhPerMin" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceEnergyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceUsageInsight" (
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

    CONSTRAINT "DeviceUsageInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceEnergyProfile_systemId_idx" ON "ServiceEnergyProfile"("systemId");

-- CreateIndex
CREATE INDEX "ServiceEnergyProfile_equipmentId_idx" ON "ServiceEnergyProfile"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceEnergyProfile_systemId_equipmentId_serviceId_key" ON "ServiceEnergyProfile"("systemId", "equipmentId", "serviceId");

-- CreateIndex
CREATE INDEX "DeviceUsageInsight_systemId_idx" ON "DeviceUsageInsight"("systemId");

-- CreateIndex
CREATE INDEX "DeviceUsageInsight_appointmentId_idx" ON "DeviceUsageInsight"("appointmentId");

-- CreateIndex
CREATE INDEX "DeviceUsageInsight_insightType_idx" ON "DeviceUsageInsight"("insightType");
