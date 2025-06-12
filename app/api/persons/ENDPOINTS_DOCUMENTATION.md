# Endpoints de la API de Persons

Este documento lista todos los endpoints disponibles en `/api/persons/` que fueron migrados desde la antigua API de clientes.

## Endpoints Principales

### 1. Gestión de Personas
- `GET /api/persons` - Obtener lista de personas
- `POST /api/persons` - Crear nueva persona
- `GET /api/persons/[id]` - Obtener detalle de persona
- `PUT /api/persons/[id]` - Actualizar persona
- `DELETE /api/persons/[id]` - Eliminar persona

## Endpoints Relacionales

### 2. Bonos
- `GET /api/persons/[id]/bonos` - Obtener bonos activos de una persona
  - Devuelve lista de `BonoInstance` con información del bono, cantidades restantes y fechas

### 3. Pagos Aplazados
- `GET /api/persons/[id]/deferred-payments` - Obtener pagos aplazados de una persona
  - Devuelve lista de `Payment` donde `isDeferred = true`

### 4. Compras y Pagos
- `GET /api/persons/[id]/tickets-as-receiver` - Tickets donde la persona es receptora del servicio
  - Incluye información del pagador si es diferente
- `GET /api/persons/[id]/tickets-as-payer` - Tickets donde la persona pagó por otros
  - Solo tickets donde `payerPersonId !== personId`
- `GET /api/persons/[id]/payments-as-payer` - Todos los pagos realizados por la persona

## Endpoints Pendientes de Implementación

Los siguientes endpoints podrían necesitar implementación futura:

### 5. Historial
- `GET /api/persons/[id]/appointments` - Historial de citas
- `GET /api/persons/[id]/services-history` - Historial de servicios realizados

### 6. Consentimientos
- `GET /api/persons/[id]/consents` - Consentimientos firmados
- `POST /api/persons/[id]/consents` - Registrar nuevo consentimiento

### 7. Fotografías
- `GET /api/persons/[id]/images` - Imágenes de la persona
- `POST /api/persons/[id]/images` - Subir nueva imagen

### 8. Avisos
- `GET /api/persons/[id]/notices` - Avisos/alertas de la persona
- `POST /api/persons/[id]/notices` - Crear nuevo aviso

## Notas de Migración

1. Todos los endpoints que antes usaban `clientId` ahora usan `personId`
2. Las respuestas mantienen compatibilidad con el frontend existente
3. Se mantiene la estructura de datos esperada por las páginas de UI
4. Los endpoints verifican permisos basados en `systemId` del usuario autenticado 