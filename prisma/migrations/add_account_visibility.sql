-- Añadir campo de visibilidad a las cuentas contables
-- Esto permite ocultar cuentas sin eliminarlas, útil para la configuración máxima

-- Añadir columna isVisible a ChartOfAccountEntry
ALTER TABLE "ChartOfAccountEntry" 
ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- Índice para mejorar búsquedas de cuentas visibles
CREATE INDEX "ChartOfAccountEntry_isVisible_idx" 
ON "ChartOfAccountEntry"("isVisible");

-- Comentario explicativo
COMMENT ON COLUMN "ChartOfAccountEntry"."isVisible" 
IS 'Indica si la cuenta debe mostrarse en la interfaz. Útil para ocultar cuentas de la configuración máxima que no se utilizan.';

-- Añadir también a PaymentMethod para consistencia
ALTER TABLE "PaymentMethod" 
ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- Índice para métodos de pago visibles
CREATE INDEX "PaymentMethod_isVisible_idx" 
ON "PaymentMethod"("isVisible");

-- Actualizar vista o función para filtrar solo cuentas visibles por defecto
-- (Esto sería implementado según las vistas existentes en el sistema)
