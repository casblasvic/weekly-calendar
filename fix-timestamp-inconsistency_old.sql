-- ========================================
-- FIX: Inconsistencia de Timestamps en Appointments
-- ========================================
-- PROBLEMA: startTime es 'timestamp' y endTime es 'timestamptz'
-- SOLUCIÓN: Convertir startTime a 'timestamptz' para consistencia

-- ✅ PASO 1: Backup de la tabla (por seguridad)
CREATE TABLE saasavatar.appointments_backup_$(date +%Y%m%d) AS 
SELECT * FROM saasavatar.appointments;

-- ✅ PASO 2: Agregar nueva columna startTime como timestamptz
ALTER TABLE saasavatar.appointments 
ADD COLUMN "startTimeNew" timestamp with time zone;

-- ✅ PASO 3: Migrar datos existentes
-- Asumir UTC para datos existentes sin timezone info
UPDATE saasavatar.appointments 
SET "startTimeNew" = "startTime" AT TIME ZONE 'UTC';

-- ✅ PASO 4: Para datos futuros, usar timezone de clínica
-- (Este paso requiere lógica de aplicación para obtener timezone de clínica)

-- ✅ PASO 5: Verificar migración
SELECT 
    id,
    "startTime" as old_start,
    "startTimeNew" as new_start,
    "endTime",
    "startTime" AT TIME ZONE 'UTC' as converted_check
FROM saasavatar.appointments 
LIMIT 5;

-- ✅ PASO 6: Drop columna antigua y renombrar (EJECUTAR SOLO DESPUÉS DE VERIFICAR)
-- ALTER TABLE saasavatar.appointments DROP COLUMN "startTime";
-- ALTER TABLE saasavatar.appointments RENAME COLUMN "startTimeNew" TO "startTime";

-- ✅ PASO 7: Recrear índice
-- DROP INDEX IF EXISTS "appointments_startTime_idx";
-- CREATE INDEX "appointments_startTime_idx" ON saasavatar.appointments USING btree ("startTime");

-- ========================================
-- ACTUALIZACIÓN DE SCHEMA PRISMA REQUERIDA
-- ========================================
/*
En prisma/schema.prisma cambiar:

DE:
startTime     DateTime  @db.Timestamp(3)
endTime       DateTime  @db.Timestamptz(3)

A:
startTime     DateTime  @db.Timestamptz(3)  // ✅ CAMBIAR A timestamptz
endTime       DateTime  @db.Timestamptz(3)  // ✅ MANTENER timestamptz

Y ejecutar:
npx prisma db push
*/ 