/*
  Warnings:

  - Made the column `systemId` on table `promotion_compatibilities` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "promotion_compatibilities" ALTER COLUMN "systemId" SET NOT NULL;
