-- Verificar si la columna ya existe
SELECT 
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'saasavatar' 
        AND table_name = 'WebSocketConnection'
        AND column_name = 'loggingEnabled'
    ) as column_exists;

-- Verificar estructura actual de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'saasavatar' 
AND table_name = 'WebSocketConnection'
ORDER BY ordinal_position;

-- Verificar si hay bloqueos en la tabla
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    backend_start,
    state,
    query
FROM pg_stat_activity
WHERE query ILIKE '%WebSocketConnection%'
AND state != 'idle';
