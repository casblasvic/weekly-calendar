-- CreateTable
CREATE TABLE "appointment_extensions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "previousDuration" INTEGER NOT NULL,
    "newDuration" INTEGER NOT NULL,
    "extendedBy" INTEGER NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_extensions_appointmentId_idx" ON "appointment_extensions"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_extensions_userId_idx" ON "appointment_extensions"("userId");

-- CreateIndex
CREATE INDEX "appointment_extensions_createdAt_idx" ON "appointment_extensions"("createdAt");
