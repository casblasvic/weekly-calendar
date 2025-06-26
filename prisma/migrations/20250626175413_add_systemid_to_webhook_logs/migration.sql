/*
  Warnings:

  - You are about to drop the `WebhookLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "WebhookLog";

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "body" JSONB,
    "sourceIp" TEXT,
    "statusCode" INTEGER,
    "responseBody" JSONB,
    "isSuccess" BOOLEAN NOT NULL DEFAULT false,
    "wasProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingError" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_logs_webhookId_idx" ON "webhook_logs"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_isSuccess_idx" ON "webhook_logs"("isSuccess");

-- CreateIndex
CREATE INDEX "webhook_logs_wasProcessed_idx" ON "webhook_logs"("wasProcessed");

-- CreateIndex
CREATE INDEX "webhook_logs_systemId_idx" ON "webhook_logs"("systemId");
