/*
  Warnings:

  - You are about to drop the `SmartDevice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SmartDevice";

-- CreateTable
CREATE TABLE "SmartPlugDevice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceIp" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "SmartPlugDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmartPlugDevice_equipmentId_key" ON "SmartPlugDevice"("equipmentId");
