-- CreateTable
CREATE TABLE "smart_plug_power_samples" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "deviceId" TEXT NOT NULL,
    "usageId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "watts" DOUBLE PRECISION NOT NULL,
    "totalEnergy" DOUBLE PRECISION NOT NULL,
    "relayOn" BOOLEAN NOT NULL,
    "servicesInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "smart_plug_power_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_service_energy_usage" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "clientId" TEXT,
    "userId" TEXT,
    "usageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "equipmentId" TEXT,
    "estimatedMinutes" DOUBLE PRECISION NOT NULL,
    "realMinutes" DOUBLE PRECISION NOT NULL,
    "allocatedKwh" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_service_energy_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smart_plug_power_samples_deviceId_timestamp_idx" ON "smart_plug_power_samples"("deviceId", "timestamp");

-- CreateIndex
CREATE INDEX "smart_plug_power_samples_usageId_idx" ON "smart_plug_power_samples"("usageId");

-- CreateIndex
CREATE INDEX "smart_plug_power_samples_systemId_idx" ON "smart_plug_power_samples"("systemId");

-- CreateIndex
CREATE INDEX "appointment_service_energy_usage_serviceId_createdAt_idx" ON "appointment_service_energy_usage"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "appointment_service_energy_usage_clinicId_serviceId_equipme_idx" ON "appointment_service_energy_usage"("clinicId", "serviceId", "equipmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_service_energy_usage_usageId_serviceId_key" ON "appointment_service_energy_usage"("usageId", "serviceId");
