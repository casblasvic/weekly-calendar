-- AlterTable
ALTER TABLE "smart_plug_service_energy_profiles" ADD COLUMN     "m2KwhPerMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "m2Minutes" DOUBLE PRECISION NOT NULL DEFAULT 0;
