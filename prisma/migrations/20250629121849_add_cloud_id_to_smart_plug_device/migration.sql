/*
  Warnings:

  - A unique constraint covering the columns `[type,referenceId]` on the table `WebSocketConnection` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SmartPlugDevice" ADD COLUMN     "cloudId" TEXT;

-- AlterTable
ALTER TABLE "WebSocketConnection" ADD COLUMN     "autoReconnect" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "websocket_logs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "errorDetails" TEXT,
    "metadata" JSONB,
    "responseTime" INTEGER,
    "dataSize" INTEGER,
    "clientIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "websocket_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "websocket_logs_connectionId_idx" ON "websocket_logs"("connectionId");

-- CreateIndex
CREATE INDEX "websocket_logs_eventType_idx" ON "websocket_logs"("eventType");

-- CreateIndex
CREATE INDEX "websocket_logs_createdAt_idx" ON "websocket_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebSocketConnection_type_referenceId_key" ON "WebSocketConnection"("type", "referenceId");
