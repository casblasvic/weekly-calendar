/*
  Warnings:

  - A unique constraint covering the columns `[integrationId]` on the table `Webhook` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Webhook_integrationId_key" ON "Webhook"("integrationId");
