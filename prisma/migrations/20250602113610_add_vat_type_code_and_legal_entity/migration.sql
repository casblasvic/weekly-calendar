/*
  Warnings:

  - A unique constraint covering the columns `[code,systemId]` on the table `vat_types` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `vat_types` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "vat_types_name_systemId_key";

-- AlterTable: Primero añadir la columna code como nullable
ALTER TABLE "vat_types" ADD COLUMN "code" TEXT;

-- Actualizar registros existentes con un código basado en el nombre
UPDATE "vat_types" 
SET "code" = CASE 
  WHEN LOWER("name") LIKE '%general%' OR "rate" = 21 THEN 'VAT_STANDARD'
  WHEN LOWER("name") LIKE '%reducid%' OR "rate" = 10 THEN 'VAT_REDUCED'
  WHEN LOWER("name") LIKE '%super%' OR "rate" = 4 THEN 'VAT_SUPER_REDUCED'
  WHEN LOWER("name") LIKE '%exempt%' OR "rate" = 0 THEN 'VAT_EXEMPT'
  ELSE UPPER(REPLACE("name", ' ', '_'))
END
WHERE "code" IS NULL;

-- Ahora hacer la columna NOT NULL
ALTER TABLE "vat_types" ALTER COLUMN "code" SET NOT NULL;

-- Añadir la columna legalEntityId
ALTER TABLE "vat_types" ADD COLUMN "legalEntityId" TEXT;

-- CreateIndex
CREATE INDEX "vat_types_legalEntityId_idx" ON "vat_types"("legalEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "vat_types_code_systemId_key" ON "vat_types"("code", "systemId");
