-- AlterTable
ALTER TABLE "bono_instances" ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "package_instances" ALTER COLUMN "clientId" DROP NOT NULL;
