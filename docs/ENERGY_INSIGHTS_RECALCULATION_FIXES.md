# 🔧 CORRECCIONES AL SISTEMA DE RECÁLCULO DE ENERGY INSIGHTS

## 📋 Resumen de Problemas Identificados y Solucionados

### **🔍 Problema 1: ServiceGroupEnergyProfile sin equipmentId**
**Problema**: El modelo `ServiceGroupEnergyProfile` no tenía `equipmentId`, lo cual era inconsistente con `ServiceEnergyProfile` y limitaba el análisis por equipment específico.

**Solución**:
- ✅ Agregado `equipmentId` al modelo `ServiceGroupEnergyProfile`
- ✅ Agregada relación inversa en modelo `Equipment`
- ✅ Actualizado unique constraint: `[clinicId, equipmentId, serviceId, hourBucket]`
- ✅ Actualizado finalizer para incluir `equipmentId` en cálculos

### **🔍 Problema 2: Lógica de Cálculo de Grupos Incorrecta**
**Problema**: El finalizer estaba usando datos desagregados en lugar de usar directamente `appointment_device_usage` que representa el uso real agrupado.

**Solución**:
- ✅ Actualizada función `upsertGroupProfile` para usar datos directos de `appointment_device_usage`
- ✅ Usar `usage.energyConsumption` directamente (consumo agrupado real)
- ✅ Usar `usage.actualMinutes` directamente (duración real agrupada)
- ✅ Mantener algoritmo de Welford para estadísticas incrementales

### **🔍 Problema 3: Conversiones de Energía Incorrectas**
**Problema**: Riesgo de conversiones incorrectas entre watts, Wh y kWh en el pipeline de datos.

**Verificación realizada**:
- ✅ `energyConsumption` en `appointment_device_usage` almacena **kWh** (desde `status.power.total`)
- ✅ Gen1: Convierte Watt-minuto a kWh con `wattMinuteToKwh()`
- ✅ Gen2: Reporta directamente en kWh (`aenergy.total`)
- ✅ UI muestra correctamente en kWh
- ⚠️ **IMPORTANTE**: Mantener consistencia en todas las conversiones

### **🔍 Problema 4: Flujo de Datos Incompleto**
**Problema**: El seeder no seguía el flujo completo de datos, saltándose pasos críticos del finalizer.

**Solución**:
- ✅ Actualizado `seed-anomalias.ts` para llamar `finalizeDeviceUsage()` en cada registro
- ✅ Garantiza generación completa de:
  - `appointment_service_energy_usage`
  - `smart_plug_service_energy_profiles`
  - `smart_plug_service_group_energy_profile`
  - `smart_plug_device_usage_insights`
  - `smart_plug_client_anomaly_scores`
  - `smart_plug_employee_anomaly_scores`

### **🔍 Problema 5: Botón de Recálculo sin Feedback Visual**
**Problema**: El botón "Recalcular" no tenía animación ni feedback visual durante el proceso.

**Solución**:
- ✅ Agregado estado `isRecalculating` 
- ✅ Animación del icono Brain con pulsación y brillo
- ✅ Cambio de texto durante recálculo: "Recalculando..."
- ✅ Botón deshabilitado durante proceso
- ✅ Efectos visuales: `animate-pulse`, `text-blue-500`, `drop-shadow-lg`

## 🔧 Cambios Técnicos Realizados

### **Schema (prisma/schema.prisma)**
```prisma
model ServiceGroupEnergyProfile {
  id            String   @id @default(cuid())
  systemId      String
  clinicId      String
  equipmentId   String   // 🔧 AGREGADO
  serviceId     String
  hourBucket    Int
  // ... resto de campos
  
  // Relaciones
  equipment Equipment @relation(fields: [equipmentId], references: [id])
  service   Service   @relation(fields: [serviceId], references: [id])
  clinic    Clinic    @relation(fields: [clinicId], references: [id])

  @@unique([clinicId, equipmentId, serviceId, hourBucket])
  @@index([equipmentId])
}
```

### **Finalizer (lib/energy/usage-finalizer.ts)**
```typescript
// 🔄 ACTUALIZAR PERFIL POR GRUPO DE SERVICIOS
await upsertGroupProfile({
  systemId: usage.systemId,
  clinicId: usage.appointment!.clinicId,
  equipmentId: usage.equipmentId!, // 🔧 AGREGADO
  serviceId: serviceIds[0],
  hourBucket: new Date(usage.startedAt).getHours(),
  kwh: usage.energyConsumption,    // 🔧 DATOS DIRECTOS
  minutes: usage.actualMinutes     // 🔧 DATOS DIRECTOS
})
```

### **Frontend (energy-insights/page.tsx)**
```typescript
const [isRecalculating, setIsRecalculating] = useState(false)

<Button variant="outline" size="sm" onClick={handleRecalculate} disabled={isRecalculating}>
  <Brain className={`w-4 h-4 mr-2 transition-all duration-300 ${
    isRecalculating 
      ? 'animate-pulse text-blue-500 drop-shadow-lg' 
      : 'text-gray-600 hover:text-blue-500'
  }`} />
  {isRecalculating ? 'Recalculando...' : 'Recalcular'}
</Button>
```

## 🎯 Verificaciones de Unidades de Energía

### **Pipeline de Datos**
1. **WebSocket Shelly** → Potencia instantánea (watts) + Energía total (Wh o kWh)
2. **device-control.ts** → `status.power.total` (kWh) → `energyConsumption`
3. **appointment_device_usage** → Almacena en **kWh**
4. **usage-finalizer.ts** → Usa kWh directamente, no convierte
5. **UI** → Muestra kWh con `formatConsumption()`

### **Conversiones por Generación**
- **Gen1**: `wattMinuteToKwh()` convierte Watt-minuto → kWh
- **Gen2**: `aenergy.total` ya está en kWh
- **Gen3**: Similar a Gen2

## 📊 Beneficios Obtenidos

1. **Consistencia de Datos**: Perfiles de grupos ahora incluyen equipmentId
2. **Precisión**: Uso de datos reales agrupados en lugar de desagregados
3. **Integridad**: Verificación de conversiones de energía
4. **UX Mejorada**: Feedback visual durante recálculo
5. **Completitud**: Flujo completo de datos en seeding

## ⚠️ Precauciones Futuras

1. **Conversiones de Energía**: Siempre verificar unidades en nuevos endpoints
2. **Consistencia de Schema**: Mantener equipmentId en todos los perfiles energéticos
3. **Flujo de Datos**: Usar finalizer completo en lugar de atajos
4. **Testing**: Probar recálculo con datos reales antes de producción

## 🔗 Archivos Modificados

- `prisma/schema.prisma` - Agregado equipmentId
- `lib/energy/usage-finalizer.ts` - Lógica de grupos corregida
- `prisma/seed-anomalias.ts` - Flujo completo de datos
- `app/(main)/configuracion/integraciones/energy-insights/page.tsx` - Animación del cerebro
- `docs/ENERGY_INSIGHTS_RECALCULATION_FIXES.md` - Esta documentación

---

**Fecha**: $(date)
**Autor**: AI Assistant
**Contexto**: Corrección de sistema de recálculo de Energy Insights 