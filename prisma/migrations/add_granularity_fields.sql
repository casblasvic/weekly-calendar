-- Añadir granularidad a los templates
ALTER TABLE schedule_templates 
ADD COLUMN create_granularity INT DEFAULT 5;

-- Añadir granularidad a los horarios personalizados
ALTER TABLE clinic_schedules 
ADD COLUMN create_granularity INT DEFAULT 5;

-- Añadir restricción para asegurar coherencia
-- (esto es pseudocódigo, depende del motor de BD)
-- CHECK (slot_duration % create_granularity = 0)
