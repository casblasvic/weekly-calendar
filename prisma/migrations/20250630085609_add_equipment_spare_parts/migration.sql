-- CreateTable
CREATE TABLE "equipment_spare_parts" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "compatibleModels" TEXT,
    "recommendedLifespan" INTEGER,
    "warningThreshold" INTEGER,
    "criticalThreshold" INTEGER,
    "installationNotes" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spare_part_installations" (
    "id" TEXT NOT NULL,
    "equipmentSparePartId" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL,
    "installedByUserId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "removedAt" TIMESTAMP(3),
    "removedByUserId" TEXT,
    "serialNumber" TEXT,
    "batchNumber" TEXT,
    "costPrice" DOUBLE PRECISION,
    "initialUsageHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentUsageHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedEndOfLife" TIMESTAMP(3),
    "installationNotes" TEXT,
    "removalReason" TEXT,
    "condition" TEXT,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_part_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_usage_logs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dailyHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weeklyHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "equipment_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_spare_parts_equipmentId_idx" ON "equipment_spare_parts"("equipmentId");

-- CreateIndex
CREATE INDEX "equipment_spare_parts_productId_idx" ON "equipment_spare_parts"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_spare_parts_equipmentId_productId_key" ON "equipment_spare_parts"("equipmentId", "productId");

-- CreateIndex
CREATE INDEX "spare_part_installations_equipmentSparePartId_idx" ON "spare_part_installations"("equipmentSparePartId");

-- CreateIndex
CREATE INDEX "spare_part_installations_installedAt_idx" ON "spare_part_installations"("installedAt");

-- CreateIndex
CREATE INDEX "spare_part_installations_isActive_idx" ON "spare_part_installations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_usage_logs_equipmentId_key" ON "equipment_usage_logs"("equipmentId");
