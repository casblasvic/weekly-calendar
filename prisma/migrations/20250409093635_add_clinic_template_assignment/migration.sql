-- CreateTable
CREATE TABLE "clinic_template_assignments" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "systemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_template_assignments_clinicId_startDate_idx" ON "clinic_template_assignments"("clinicId", "startDate");

-- CreateIndex
CREATE INDEX "clinic_template_assignments_templateId_idx" ON "clinic_template_assignments"("templateId");

-- CreateIndex
CREATE INDEX "clinic_template_assignments_systemId_idx" ON "clinic_template_assignments"("systemId");
