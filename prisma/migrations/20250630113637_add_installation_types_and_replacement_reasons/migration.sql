-- CreateEnum
CREATE TYPE "InstallationType" AS ENUM ('INITIAL_INSTALLATION', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "ReplacementReason" AS ENUM ('NORMAL_WEAR', 'PREMATURE_FAILURE', 'PREVENTIVE_MAINTENANCE', 'UPGRADE', 'DEFECTIVE');

-- AlterTable
ALTER TABLE "spare_part_installations" ADD COLUMN     "installationType" "InstallationType" NOT NULL DEFAULT 'INITIAL_INSTALLATION',
ADD COLUMN     "replacedInstallationId" TEXT,
ADD COLUMN     "replacementReason" "ReplacementReason";

-- CreateIndex
CREATE INDEX "spare_part_installations_replacedInstallationId_idx" ON "spare_part_installations"("replacedInstallationId");
