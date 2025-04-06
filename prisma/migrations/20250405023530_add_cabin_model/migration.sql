-- CreateTable
CREATE TABLE "cabins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "color" TEXT,
    "order" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clinicId" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cabins_clinicId_idx" ON "cabins"("clinicId");

-- CreateIndex
CREATE INDEX "cabins_systemId_idx" ON "cabins"("systemId");

-- CreateIndex
CREATE UNIQUE INDEX "cabins_name_clinicId_key" ON "cabins"("name", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "cabins_code_clinicId_key" ON "cabins"("code", "clinicId");
