-- Script para agregar el campo loggingEnabled de forma segura
BEGIN;

-- Establecer timeout más largo para esta transacción
SET LOCAL statement_timeout = '300s';

-- Agregar la columna con valor por defecto
ALTER TABLE "WebSocketConnection" 
ADD COLUMN IF NOT EXISTS "loggingEnabled" BOOLEAN DEFAULT true;

-- Confirmar que la columna se agregó
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'saasavatar' 
AND table_name = 'WebSocketConnection'
AND column_name = 'loggingEnabled';

COMMIT;
