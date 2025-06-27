-- AlterTable
ALTER TABLE "SmartPlugDevice" ADD COLUMN     "credentialId" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relayOn" BOOLEAN;

-- CreateTable
CREATE TABLE "shelly_credentials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "apiHost" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelly_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shelly_credentials_systemId_idx" ON "shelly_credentials"("systemId");

-- CreateIndex
CREATE INDEX "shelly_credentials_clinicId_idx" ON "shelly_credentials"("clinicId");

-- CreateIndex
CREATE INDEX "shelly_credentials_status_idx" ON "shelly_credentials"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shelly_credentials_email_clinicId_key" ON "shelly_credentials"("email", "clinicId");

-- CreateIndex
CREATE INDEX "SmartPlugDevice_credentialId_idx" ON "SmartPlugDevice"("credentialId");
