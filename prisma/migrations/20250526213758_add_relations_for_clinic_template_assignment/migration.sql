-- CreateTable
CREATE TABLE "clinic_template_assignments" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_template_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_template_assignments_clinicId_idx" ON "clinic_template_assignments"("clinicId");

-- CreateIndex
CREATE INDEX "clinic_template_assignments_templateId_idx" ON "clinic_template_assignments"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_template_assignments_clinicId_templateId_startDate_key" ON "clinic_template_assignments"("clinicId", "templateId", "startDate");
