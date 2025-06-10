-- CreateTable
CREATE TABLE "entity_segment_configs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_segment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entity_segment_configs_systemId_entityType_key" ON "entity_segment_configs"("systemId", "entityType");
