/*
  Warnings:

  - You are about to drop the `webhook_executions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `webhook_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `webhooks` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT');

-- DropTable
DROP TABLE "webhook_executions";

-- DropTable
DROP TABLE "webhook_logs";

-- DropTable
DROP TABLE "webhooks";

-- CreateTable
CREATE TABLE "Webhook" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'incoming',
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedMethods" JSONB,
    "token" TEXT,
    "secretKey" TEXT,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "ipWhitelist" TEXT[],
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 120,
    "triggerEvents" JSONB,
    "targetUrl" TEXT,
    "dataMapping" JSONB,
    "expectedSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
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
    "processedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_token_key" ON "Webhook"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_systemId_slug_key" ON "Webhook"("systemId", "slug");
