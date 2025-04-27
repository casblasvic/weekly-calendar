/*
  Warnings:

  - You are about to drop the column `numberOfSessions` on the `bono_definitions` table. All the data in the column will be lost.
  - Added the required column `sessions` to the `bono_definitions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bono_definitions" DROP COLUMN "numberOfSessions",
ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessions" INTEGER NOT NULL,
ALTER COLUMN "serviceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "package_definitions" ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "pointsAwarded" INTEGER NOT NULL DEFAULT 0;
