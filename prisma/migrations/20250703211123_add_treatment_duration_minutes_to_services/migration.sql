/*
  Warnings:

  - You are about to drop the `auto_shutdown_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "services" ADD COLUMN     "treatmentDurationMinutes" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "auto_shutdown_logs";
