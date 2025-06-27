-- CreateTable
CREATE TABLE "WebSocketConnection" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastPingAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebSocketConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebSocketConnection_type_referenceId_idx" ON "WebSocketConnection"("type", "referenceId");

-- CreateIndex
CREATE INDEX "WebSocketConnection_status_idx" ON "WebSocketConnection"("status");
