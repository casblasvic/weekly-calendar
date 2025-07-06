-- Script simplificado para agregar loggingEnabled
-- Solo agrega la columna sin tocar foreign keys o constraints

DO $$ 
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'saasavatar' 
        AND table_name = 'WebSocketConnection'
        AND column_name = 'loggingEnabled'
    ) THEN
        -- Agregar la columna
        ALTER TABLE "saasavatar"."WebSocketConnection" 
        ADD COLUMN "loggingEnabled" BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Columna loggingEnabled agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna loggingEnabled ya existe';
    END IF;
END $$;
