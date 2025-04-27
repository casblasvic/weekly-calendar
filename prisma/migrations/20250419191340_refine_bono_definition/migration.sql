/*
  Warnings:

  - You are about to drop the column `code` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `colorCode` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `formattedDescription` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `termsAndConditions` on the `bono_definitions` table. All the data in the column will be lost.
  - You are about to drop the column `remainingSessions` on the `bono_instances` table. All the data in the column will be lost.
  - Added the required column `remainingQuantity` to the `bono_instances` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bono_definitions_name_key";

-- AlterTable
ALTER TABLE "bono_definitions" DROP COLUMN "code",
DROP COLUMN "colorCode",
DROP COLUMN "formattedDescription",
DROP COLUMN "imageUrl",
DROP COLUMN "termsAndConditions";

-- AlterTable
ALTER TABLE "bono_instances" DROP COLUMN "remainingSessions",
ADD COLUMN     "remainingQuantity" INTEGER NOT NULL;
