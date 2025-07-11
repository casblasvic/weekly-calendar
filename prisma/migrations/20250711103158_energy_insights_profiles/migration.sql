-- AlterTable
ALTER TABLE "smart_plug_service_energy_profiles" ADD COLUMN     "avgMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "stdDevMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "smart_plug_service_group_energy_profile" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "servicesHash" TEXT NOT NULL,
    "services" JSONB,
    "hourBucket" INTEGER NOT NULL,
    "meanKwh" DOUBLE PRECISION NOT NULL,
    "stdDevKwh" DOUBLE PRECISION NOT NULL,
    "meanMinutes" DOUBLE PRECISION NOT NULL,
    "stdDevMinutes" DOUBLE PRECISION NOT NULL,
    "samples" INTEGER NOT NULL DEFAULT 1,
    "m2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_plug_service_group_energy_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_plug_client_service_energy_profile" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "hourBucket" INTEGER NOT NULL,
    "meanKwh" DOUBLE PRECISION NOT NULL,
    "stdDevKwh" DOUBLE PRECISION NOT NULL,
    "meanMinutes" DOUBLE PRECISION NOT NULL,
    "stdDevMinutes" DOUBLE PRECISION NOT NULL,
    "samples" INTEGER NOT NULL DEFAULT 1,
    "m2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_plug_client_service_energy_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smart_plug_user_service_energy_profile" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "hourBucket" INTEGER NOT NULL,
    "meanKwh" DOUBLE PRECISION NOT NULL,
    "stdDevKwh" DOUBLE PRECISION NOT NULL,
    "meanMinutes" DOUBLE PRECISION NOT NULL,
    "stdDevMinutes" DOUBLE PRECISION NOT NULL,
    "samples" INTEGER NOT NULL DEFAULT 1,
    "m2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_plug_user_service_energy_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smart_plug_service_group_energy_profile_systemId_idx" ON "smart_plug_service_group_energy_profile"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "smart_plug_service_group_energy_profile_clinicId_equipmentI_key" ON "smart_plug_service_group_energy_profile"("clinicId", "equipmentId", "servicesHash", "hourBucket");

-- CreateIndex
CREATE INDEX "smart_plug_client_service_energy_profile_systemId_idx" ON "smart_plug_client_service_energy_profile"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "smart_plug_client_service_energy_profile_clinicId_clientId__key" ON "smart_plug_client_service_energy_profile"("clinicId", "clientId", "serviceId", "hourBucket");

-- CreateIndex
CREATE INDEX "smart_plug_user_service_energy_profile_systemId_idx" ON "smart_plug_user_service_energy_profile"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "smart_plug_user_service_energy_profile_clinicId_userId_serv_key" ON "smart_plug_user_service_energy_profile"("clinicId", "userId", "serviceId", "hourBucket");
