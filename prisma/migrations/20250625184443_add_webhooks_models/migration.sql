-- CreateEnum
CREATE TYPE "WebhookDirection" AS ENUM ('INCOMING', 'OUTGOING', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedMethods" TEXT[],
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "secretKey" TEXT,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 60,
    "ipWhitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customHeaders" JSONB,
    "expectedSchema" JSONB,
    "dataMapping" JSONB,
    "direction" "WebhookDirection" NOT NULL DEFAULT 'INCOMING',
    "triggerEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetUrl" TEXT,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "successfulCalls" INTEGER NOT NULL DEFAULT 0,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "queryParams" JSONB,
    "body" JSONB,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "statusCode" INTEGER,
    "responseBody" JSONB,
    "responseTime" INTEGER,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "validationErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processingErrors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wasProcessed" BOOLEAN NOT NULL DEFAULT false,
    "securityFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_executions" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "webhookLogId" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "mappedData" JSONB NOT NULL,
    "targetTable" TEXT,
    "targetRecordId" TEXT,
    "operation" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_token_key" ON "webhooks"("token");

-- CreateIndex
CREATE INDEX "webhooks_systemId_idx" ON "webhooks"("systemId");

-- CreateIndex
CREATE INDEX "webhooks_isActive_idx" ON "webhooks"("isActive");

-- CreateIndex
CREATE INDEX "webhooks_direction_idx" ON "webhooks"("direction");

-- CreateIndex
CREATE UNIQUE INDEX "webhooks_systemId_slug_key" ON "webhooks"("systemId", "slug");

-- CreateIndex
CREATE INDEX "webhook_logs_webhookId_idx" ON "webhook_logs"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_logs_timestamp_idx" ON "webhook_logs"("timestamp");

-- CreateIndex
CREATE INDEX "webhook_logs_statusCode_idx" ON "webhook_logs"("statusCode");

-- CreateIndex
CREATE INDEX "webhook_logs_wasProcessed_idx" ON "webhook_logs"("wasProcessed");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_executions_webhookLogId_key" ON "webhook_executions"("webhookLogId");

-- CreateIndex
CREATE INDEX "webhook_executions_webhookId_idx" ON "webhook_executions"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_executions_status_idx" ON "webhook_executions"("status");

-- CreateIndex
CREATE INDEX "webhook_executions_targetTable_idx" ON "webhook_executions"("targetTable");
