/*
  Warnings:

  - You are about to drop the column `closeTime` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `openTime` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the column `slotDuration` on the `clinics` table. All the data in the column will be lost.
  - You are about to drop the `clinic_template_assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "clinics" DROP COLUMN "closeTime",
DROP COLUMN "openTime",
DROP COLUMN "slotDuration";

-- DropTable
DROP TABLE "clinic_template_assignments";
