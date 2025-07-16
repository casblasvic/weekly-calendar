# 🔄 SISTEMA DE RECÁLCULO DE ENERGY INSIGHTS - ARQUITECTURA ACTUALIZADA

## 📋 Resumen

El sistema de recálculo de Energy Insights ha sido actualizado para trabajar con la nueva arquitectura de scores de anomalías, reemplazando el sistema legacy de perfiles energéticos granulares.

## 🎯 Funcionalidades

### 1. Botón de Recálculo en UI
- **Ubicación**: Energy Insights Dashboard → Botón "Recalcular" (icono Brain)
- **Funcionalidad**: Recalcula perfiles energéticos Y scores de anomalías
- **Filtros**: Respeta selector de clínica actual
- **API**: `POST /api/internal/energy-insights/recalc`

### 2. Script de Línea de Comandos
- **Archivo**: `scripts/recalculate-anomaly-scores.cjs`
- **Uso**: 
  ```bash
  node scripts/recalculate-anomaly-scores.cjs [systemId] [clinicId]
  ```
- **Ejemplos**:
  ```bash
  # Todos los sistemas
  node scripts/recalculate-anomaly-scores.cjs
  
  # Sistema específico
  node scripts/recalculate-anomaly-scores.cjs cm123abc
  
  # Sistema y clínica específica
  node scripts/recalculate-anomaly-scores.cjs cm123abc clinic1
  ```

## 🏗️ Arquitectura del Recálculo

### Paso 1: Recálculo de ServiceEnergyProfile (Legacy)
- Obtiene `appointment_device_usage` con status `COMPLETED`
- Filtra servicios con status `VALIDATED`
- Aplica lógica `treatmentDurationMinutes` vs `durationMinutes`
- Actualiza perfiles usando algoritmo Welford

### Paso 2: 🆕 Recálculo de Scores de Anomalías
- Agrupa usages por cliente y empleado
- Calcula desviaciones de tiempo real vs esperado
- Detecta anomalías (desviación > 20%)
- Actualiza `ClientAnomalyScore` y `EmployeeAnomalyScore`

### Paso 3: Generación de Insights
- Re-evalúa insights usando nueva lógica
- Crea `DeviceUsageInsight` para anomalías detectadas
- Aplica umbral de confianza contextual

## 📊 Datos Procesados

### Entrada
- `AppointmentDeviceUsage` con `currentStatus = 'COMPLETED'`
- `AppointmentService` con `status = 'VALIDATED'`
- Filtros opcionales: `startDate`, `endDate`, `clinicId`

### Salida
- `ServiceEnergyProfile` actualizado (legacy pero útil)
- `ClientAnomalyScore` recalculado
- `EmployeeAnomalyScore` recalculado
- `DeviceUsageInsight` generado

## 🎯 Algoritmos de Scoring

### ClientAnomalyScore
```typescript
riskScore = base(anomalyRate) + patterns + favoredEmployees + maxDeviation
- base: anomalyRate * 0.4 (máx 40 puntos)
- patterns: 5-12 puntos por tipo de patrón
- favoredEmployees: 20/10/5 puntos por 1/2/3 empleados
- maxDeviation: maxDeviation/10 (máx 10 puntos)
```

### EmployeeAnomalyScore
```typescript
riskScore = base(anomalyRate) + efficiency + consistency + favoredClients + fraudIndicators
- base: anomalyRate * 0.3 (máx 30 puntos)
- efficiency: (70-efficiency)*0.5 si <70 (máx 25 puntos)
- consistency: (80-consistency)*0.25 si <80 (máx 20 puntos)
- favoredClients: 15/10 puntos por concentración
- fraudIndicators: 3 puntos por indicador (máx 10)
```

## 🔧 Configuración

### Variables de Entorno
- `FEATURE_SHELLY`: Debe estar activo para funcionar
- Usa configuración estándar de Prisma y autenticación

### Constraints de Base de Datos
- `ClientAnomalyScore`: `systemId_clinicId_clientId`
- `EmployeeAnomalyScore`: `systemId_employeeId` (sin clinicId)

## 🚀 Rendimiento

### Optimizaciones Implementadas
- Consultas agrupadas por cliente/empleado
- Algoritmo incremental Welford para perfiles
- Procesamiento en lotes para scores
- Cache invalidation automático

### Métricas Típicas
- ~1000 device usages: 2-3 segundos
- ~100 clientes: 5-10 segundos de recálculo
- ~50 empleados: 3-5 segundos de recálculo

## 🛡️ Validaciones

### Datos de Entrada
- `energyConsumption > 0`
- `actualMinutes > 0`
- `appointment.personId` existe
- `appointment.professionalUser` existe
- Solo servicios `VALIDATED`

### Manejo de Errores
- Errores por cliente/empleado no detienen el proceso
- Logs detallados para debugging
- Rollback automático en caso de error crítico

## 📈 Monitoreo

### Logs de Proceso
```
🔄 [RECALC] Iniciando recálculo para systemId: cm123abc
📅 [RECALC] Filtros de fecha: startDate, endDate
📊 [RECALC] Usos de dispositivo encontrados: 1234
📈 [RECALC] Datos procesados: 1234 usos, 567 servicios, 89 combinaciones
🎯 [RECALC] Recalculando scores de anomalías...
✅ [RECALC] Recálculo completado exitosamente
```

### Respuesta de API
```json
{
  "success": true,
  "data": {
    "profilesRecalculated": 89,
    "usagesReprocessed": 1234,
    "servicesProcessed": 567,
    "insightsCreated": 23,
    "clientScoresUpdated": 145,
    "employeeScoresUpdated": 67,
    "message": "✅ Recálculo completo: 89 perfiles, 145 scores de clientes, 67 scores de empleados actualizados..."
  }
}
```

## 🔗 Referencias

- **API**: `app/api/internal/energy-insights/recalc/route.ts`
- **Script**: `scripts/recalculate-anomaly-scores.cjs`
- **Frontend**: `app/(main)/configuracion/integraciones/energy-insights/page.tsx`
- **Scoring**: `lib/energy/anomaly-scoring.ts`
- **Finalizer**: `lib/energy/usage-finalizer.ts`

## ⚠️ Consideraciones Importantes

1. **Solo en Pruebas**: El recálculo manual es principalmente para desarrollo y testing
2. **Producción**: En producción, los scores se actualizan automáticamente cuando las citas cambian a `COMPLETED`
3. **Módulo Shelly**: Requiere que el módulo de enchufes inteligentes esté activo
4. **Multi-tenant**: Respeta aislamiento por `systemId`
5. **Datos Reales**: NUNCA hardcodea datos, todo viene de la base de datos

## 🎯 Casos de Uso

### Para Desarrollo
- Poblar datos iniciales de scoring
- Probar algoritmos de detección
- Verificar cálculos de riesgo

### Para Testing
- Simular recálculos masivos
- Validar rendimiento
- Probar filtros de fecha/clínica

### Para Soporte
- Corregir inconsistencias de datos
- Regenerar scores después de cambios
- Diagnosticar problemas de detección 