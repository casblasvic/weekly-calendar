-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "integrationId" TEXT,
ADD COLUMN     "isSystemWebhook" BOOLEAN NOT NULL DEFAULT false;
