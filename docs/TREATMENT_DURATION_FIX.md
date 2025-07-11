# 🔧 Corrección: treatmentDurationMinutes vs durationMinutes

## Problema Identificado

Los dispositivos smart plug estaban usando `service.durationMinutes` (duración total de la cita) en lugar de `service.treatmentDurationMinutes` (duración específica del uso del equipo) para calcular `estimatedMinutes` en `appointmentDeviceUsage`.

### Diferencias Conceptuales:
- **`durationMinutes`**: Duración total de la cita en la agenda (ej: 15 minutos)
- **`treatmentDurationMinutes`**: Duración específica del uso del equipo (ej: 5 minutos)

### Síntomas:
- Dispositivos aparecían con `estimatedMinutes: 15` cuando deberían tener el valor del `treatmentDurationMinutes`
- Lógica de bloqueo por tiempo no funcionaba correctamente
- Colores de dispositivos incorrectos por comparaciones de tiempo erróneas

## Archivos Corregidos

### 1. `/api/appointments/[id]/start/route.ts`
**Funciones afectadas:**
- `startAppointmentWithoutEquipment()`
- `startAppointmentWithEquipment()`  
- `startAppointmentWithSpecificAssignment()`

**Cambio aplicado:**
```typescript
// ❌ ANTES: Solo durationMinutes
const estimatedMinutes = appointment.services.reduce((total: number, svc: any) => {
  return total + (svc.service.durationMinutes || 0);
}, 0);

// ✅ DESPUÉS: treatmentDurationMinutes con fallback
const estimatedMinutes = appointment.services.reduce((total: number, svc: any) => {
  const duration = svc.service.treatmentDurationMinutes > 0 
    ? svc.service.treatmentDurationMinutes 
    : (svc.service.durationMinutes || 0);
  return total + duration;
}, 0);
```

### 2. `/api/shelly/device/[deviceId]/control/route.ts`
**Función afectada:**
- Auto-creación de registros de uso cuando faltan

**Cambio aplicado:**
```typescript
// ❌ ANTES: treatmentDurationMinutes || durationMinutes (orden incorrecto)
const dur = (s.service as any).treatmentDurationMinutes || (s.service as any).durationMinutes || 0

// ✅ DESPUÉS: Verificación explícita de > 0
const duration = (s.service as any).treatmentDurationMinutes > 0 
  ? (s.service as any).treatmentDurationMinutes 
  : ((s.service as any).durationMinutes || 0);
```

### 3. `/api/appointments/[id]/assign-device/route.ts`
**Función afectada:**
- Asignación de dispositivos a citas

**Estado:** ✅ Ya tenía la lógica correcta implementada
```typescript
const duration = service.treatmentDurationMinutes > 0 
  ? service.treatmentDurationMinutes 
  : (service.durationMinutes || 0);
```

## Script de Migración

### `scripts/fix-estimated-minutes-treatment-duration.cjs`
- Corrige registros existentes de `appointmentDeviceUsage` activos/pausados
- Solo actualiza registros con equipamiento (`equipmentId` no null)
- Recalcula `estimatedMinutes` usando la lógica corregida
- **Resultado**: 0 registros encontrados (no hay usos activos en este momento)

## Verificación de la Corrección

### Logs de Consola Esperados:
```
🕒 [BUTTON_TIME_CHECK]: {
  actualMinutes: 3.375,
  estimatedMinutes: 5,  // ✅ Ahora debería usar treatmentDurationMinutes
  autoShutdownEnabled: true,
  isTimeUp: false
}
```

### Antes vs Después:
- **Antes**: `estimatedMinutes: 15` (durationMinutes de la cita)
- **Después**: `estimatedMinutes: 5` (treatmentDurationMinutes del equipo)

## Casos de Uso

### Ejemplo: Tratamiento Facial
- **Duración de la cita**: 15 minutos (incluye preparación, tratamiento, limpieza)
- **Duración del equipo**: 5 minutos (solo el tiempo de uso del dispositivo)
- **Resultado**: El dispositivo se bloqueará después de 5 minutos, no 15

### Fallback Logic:
Si `treatmentDurationMinutes = 0` o no está definido, se usa `durationMinutes` como respaldo para mantener compatibilidad.

## Estado Actual

✅ **Problema resuelto** para nuevos registros de uso de dispositivos
✅ **Script de migración** disponible para registros existentes
✅ **Lógica centralizada** en `getDeviceColors()` funciona correctamente
✅ **Documentación** actualizada

### Próximos pasos:
1. Probar con una nueva cita que use equipamiento
2. Verificar que `estimatedMinutes` use el valor correcto
3. Confirmar que los colores y bloqueos funcionen según `treatmentDurationMinutes` 