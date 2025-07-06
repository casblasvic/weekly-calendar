-- Migración manual para agregar loggingEnabled
-- Se ejecutará directamente en Supabase SQL Editor

-- 1. Agregar la columna si no existe
ALTER TABLE "WebSocketConnection" 
ADD COLUMN IF NOT EXISTS "loggingEnabled" BOOLEAN DEFAULT true;

-- 2. Verificar que se agregó correctamente
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'saasavatar' 
AND table_name = 'WebSocketConnection'
AND column_name = 'loggingEnabled';
