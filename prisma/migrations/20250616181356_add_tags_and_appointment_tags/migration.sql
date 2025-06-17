-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentTag" (
    "appointmentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentTag_pkey" PRIMARY KEY ("appointmentId","tagId")
);

-- CreateIndex
CREATE INDEX "Tag_systemId_idx" ON "Tag"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_systemId_name_key" ON "Tag"("systemId", "name");

-- CreateIndex
CREATE INDEX "AppointmentTag_appointmentId_idx" ON "AppointmentTag"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentTag_tagId_idx" ON "AppointmentTag"("tagId");
