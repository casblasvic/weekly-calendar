-- CreateTable
CREATE TABLE "entity_change_logs" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    "systemId" TEXT NOT NULL,

    CONSTRAINT "entity_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_change_logs_entityId_entityType_idx" ON "entity_change_logs"("entityId", "entityType");

-- CreateIndex
CREATE INDEX "entity_change_logs_timestamp_idx" ON "entity_change_logs"("timestamp");
