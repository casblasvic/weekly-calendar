-- AlterTable
ALTER TABLE "cash_sessions" ADD COLUMN     "hasChangesAfterReconcile" BOOLEAN NOT NULL DEFAULT false;
