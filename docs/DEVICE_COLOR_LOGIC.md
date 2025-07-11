# 🎨 Lógica de Colores para Dispositivos - Documentación Oficial

**Fecha**: 11 de julio de 2025  
**Versión**: 3.2 (Centralizada + Sobre-tiempo + Margen 15s + Índigo + Stand-by no asignado)  
**Estado**: Implementado ✅

## 📋 Resumen

Esta documentación describe la lógica unificada de colores para dispositivos inteligentes en toda la aplicación. Se ha centralizado en `lib/utils/device-colors.ts` para garantizar consistencia absoluta.

⚠️ **CRÍTICO**: `powerThreshold` DEBE venir del equipamiento configurado, NO hardcodeado.

## 🎯 Lógica de Colores para Dispositivos Smart Plug

### Versión: 4.1 - Eliminación Drástica de ring-sky-400 🚫
**Fecha**: 2024-07-10
**Estado**: **COMPLETAMENTE FUNCIONAL** - ring-sky-400 eliminado drásticamente

### 🚫 **PROBLEMA CRÍTICO RESUELTO: ring-sky-400 ELIMINADO**

**Problema identificado:**
- Los logs mostraban `ring-2 ring-green-400` aplicándose correctamente
- Pero visualmente aparecía azul sky en lugar de verde
- **Root cause**: `ring-sky-400` estaba sobreescribiendo otros marcos

**Ubicaciones donde se aplicaba ring-sky-400:**
1. ❌ `lib/utils/device-colors.ts` línea 230 - Para casos de overtime
2. ❌ `components/appointment-item.tsx` línea 1121 - En sistema de prioridades CSS

**Solución drástica aplicada:**
```typescript
// ❌ ANTES: ring-sky-400 (causaba interferencia)
operationStatusExternal === 'over_consuming' ? 'ring-2 ring-sky-400' : ''

// ✅ AHORA: ring-purple-400 (sin interferencia)
operationStatusExternal === 'over_consuming' ? 'ring-2 ring-purple-400' : ''
```

**Cambio de color para overtime:**
- ❌ **Antes**: 🔵 Azul claro (`ring-sky-400`) - Causaba interferencia
- ✅ **Ahora**: 🟣 Púrpura (`ring-purple-400`) - Sin interferencia

### 🎉 **RESULTADO ESPERADO:**

**✅ MARCOS LIMPIOS SIN INTERFERENCIA:**
- 🟠 **Naranja**: Marco aplicado y visible sin sobreescritura
- 🟢 **Verde**: Marco aplicado y visible sin sobreescritura  
- 🟣 **Púrpura**: Para casos de overtime (reemplaza azul sky)
- 🔴 **Rojo**: Para uso no autorizado
- 🟡 **Amarillo**: Para tiempo excedido apagado
- 🟣 **Índigo**: Para completado correctamente

### 🛡️ **NUEVA FUNCIONALIDAD: Comparación Robusta de Device IDs**

**Problema previo:**
- `appointmentDeviceUsage.deviceId` podía contener diferentes tipos de ID
- Comparaciones fallaban por inconsistencias en tipos de identificadores
- WebSocket updates no siempre coincidían con registros de BD

**Solución implementada:**
```typescript
// ❌ ANTES: Comparación frágil
smartPlugDevice.deviceId === appointmentUsage.deviceId

// ✅ AHORA: Comparación robusta con múltiples identificadores
deviceIdsMatch(smartPlugDevice, appointmentUsage)
```

**Tipos de ID soportados:**
- **Database ID**: `cmcs60vu70001y2h6i6w95tt5` (registro en BD)
- **Shelly Cloud ID**: `e465b84533f0` (dispositivo físico)
- **Legacy Assignment ID**: `cmcw9sei30001y2z3tftwcq83` (registros antiguos)

### 🔧 **ARCHIVOS CON COMPARACIÓN ROBUSTA:**

1. **`lib/utils/device-id-matcher.ts`**: Funciones helper centralizadas
2. **`app/api/services/equipment-requirements/route.ts`**: API con comparación múltiple
3. **`hooks/use-service-equipment-requirements.ts`**: WebSocket updates robustos
4. **`docs/DEVICE_ID_MATCHING_STRATEGY.md`**: Documentación completa

### 🎉 **RESULTADO FINAL:**

**✅ FLUJO COMPLETAMENTE ROBUSTO:**
1. **Usuario asigna dispositivo** → Backend crea registro con cualquier tipo de ID
2. **API Equipment Requirements** → Comparación robusta encuentra el dispositivo
3. **WebSocket events** → Updates funcionan independientemente del tipo de ID
4. **Frontend actualizado** → Marco naranja aplicado correctamente 🟠

**✅ BENEFICIOS OBTENIDOS:**
- ✅ **Tolerante a inconsistencias** históricas en datos
- ✅ **Compatible** con registros antiguos y nuevos  
- ✅ **Resiliente** a cambios futuros en APIs
- ✅ **Inmune a migraciones** de estructura de datos

### 🎨 **COLORES FINALES VERIFICADOS:**

| Estado | Color | Marco | Descripción |
|--------|-------|-------|-------------|
| Relay OFF | 🔵 Azul | Sin marco | Stand-by normal |
| Relay ON + sin consumo + sin asignación | 🔵 Azul | Sin marco | Stand-by no asignado |
| Relay ON + sin consumo + asignado a esta cita | 🟠 Naranja | `ring-2 ring-orange-400` | Dispositivo asignado sin consumo |
| Relay ON + consumiendo + asignado a esta cita | 🟢 Verde | `ring-2 ring-green-400` | Dispositivo consumiendo |
| Relay ON + consumiendo + tiempo excedido | 🟣 Púrpura | `ring-2 ring-purple-400` | Dispositivo sobre-tiempo |
| Relay ON + consumiendo + sin asignación | 🔴 Rojo | `ring-2 ring-red-400` | **Uso no autorizado** |
| Ocupado por otra cita | 🔴 Rojo | Sin marco | Ocupado |
| Offline/completado | ⚫ Gris | Sin marco | No disponible |

### 📋 **CASOS DE PRUEBA EXPANDIDOS:**

**Robustez de Identificadores:**
- ✅ Registro antiguo con Database ID → Detectado correctamente
- ✅ Registro nuevo con Shelly Cloud ID → Detectado correctamente  
- ✅ WebSocket update con cualquier tipo de ID → Actualización exitosa
- ✅ Migración de datos → Sin pérdida de funcionalidad
- ✅ APIs inconsistentes → Comparación resiliente

**Estados de Dispositivos:**
- ✅ Dispositivo online + ON + sin asignación → Azul (stand-by)
- ✅ Dispositivo online + ON + asignado a cita → Naranja (sin consumo) / Verde (consumiendo)
- ✅ Dispositivo online + ON + consumiendo sin asignación → Rojo (uso no autorizado)
- ✅ Cambios en tiempo real vía WebSocket → Marcos actualizados automáticamente
- ✅ Múltiples citas simultáneas → Estados independientes correctos

### 🚀 **ARQUITECTURA FINAL:**

**Event-Driven + Robust Matching:**
- ✅ **WebSocket triggers** para invalidaciones en tiempo real [[memory:2969370]]
- ✅ **Comparación robusta** tolerante a inconsistencias
- ✅ **Múltiples identificadores** como fallback automático
- ✅ **Documentación exhaustiva** para mantenimiento futuro

**MISIÓN COMPLETADA - SISTEMA ULTRA-ROBUSTO** 🎉🛡️

### 🎨 Colores de Dispositivos (Botones)

| Estado | Color | Descripción | Disponible |
|--------|-------|-------------|------------|
| 🔵 **AZUL** | `bg-blue-500` | Relay OFF (stand-by) o Relay ON sin consumo sin asignación | ✅ Sí |
| 🟠 **NARANJA** | `bg-orange-500` | Relay ON, sin consumo, asignado a esta cita | ✅ Sí |
| 🟢 **VERDE** | `bg-green-500` | Relay ON, consumiendo, asignado a esta cita | ✅ Sí |
| 🔴 **ROJO** | `bg-red-500` | Ocupado por otra cita O consumiendo sin asignación | ❌ No |
| ⚫ **GRIS** | `bg-gray-400` | Offline o completado | ❌ No |

### 🖼️ Marcos de Citas (Appointment Borders)

| Estado | Marco | Descripción |
|--------|-------|-------------|
| 🟣 **Púrpura** | `ring-2 ring-purple-400` | Relay ON + consumiendo + tiempo excedido + asignado |
| 🟢 **Verde** | `ring-2 ring-green-400` | Relay ON + consumiendo + dentro del tiempo + asignado |
| 🟠 **Naranja** | `ring-2 ring-orange-400` | Relay ON + sin consumo + asignado |
| 🔴 **Rojo** | `ring-2 ring-red-400` | Relay ON + consumiendo + SIN asignación (uso no autorizado) |
| 🟡 **Amarillo** | `ring-2 ring-yellow-400` | Relay OFF + tiempo excedido (con margen 15s) |
| 🟣 **Índigo** | `ring-2 ring-indigo-400` | Completado correctamente dentro del tiempo |
| **Sin marco** | `''` | Stand-by, offline, completado, ocupado por otra cita |

### 🆕 Caso Crítico Agregado: Stand-by No Asignado

#### **Problema Original**
- Dispositivo: `online=true` + `relayOn=true` + `currentPower=0` + **SIN registro activo**
- Color anterior: 🟠 Naranja (incorrecto)
- Color correcto: 🔵 **AZUL** (stand-by no asignado)

#### **Lógica Corregida**
```typescript
// ⚠️ CASO NUEVO: Encendido SIN consumo Y SIN asignación = AZUL (stand-by)
if (device.relayOn && !isConsuming && device.status !== 'in_use_this_appointment') {
  return 'bg-blue-500'; // 🔵 AZUL: Stand-by (no asignado)
}
```

#### **Estados de Asignación**
- **🔵 AZUL**: Dispositivo NO asignado a ninguna cita activa
- **🟠 NARANJA**: Dispositivo asignado a ESTA cita (sin consumo)
- **🔴 ROJO**: Dispositivo asignado a OTRA cita (con consumo)

## 🔧 Implementación Técnica

### API: `/api/internal/device-usage/live-sample`
```typescript
// Lógica corregida en live-sample/route.ts
if (!relayOn && Math.abs(diffMinutes) <= toleranceColor) {
  usageStatus = 'completed_ok'
} else if (relayOn && shouldCountTime && diffMinutes > 0) {
  usageStatus = 'over_consuming'  // Solo con consumo real
} else if (!relayOn && diffMinutesWithMargin > 0) {
  usageStatus = 'over_stopped'    // Con margen de 15s
} else if (!relayOn && diffMinutes <= 0) {
  usageStatus = 'completed_ok'    // Completado correctamente
}
```

### Frontend: `lib/utils/device-colors.ts`
```typescript
// Función centralizada con nueva lógica
if (device.relayOn) {
  // ⚠️ CASO NUEVO: Encendido SIN consumo Y SIN asignación = AZUL
  if (!isConsuming && device.status !== 'in_use_this_appointment') {
    return 'bg-blue-500'; // Stand-by no asignado
  }
  
  if (isConsuming && isOvertime) {
    return 'ring-2 ring-purple-400';  // Púrpura
  } else if (isConsuming) {
    return 'ring-2 ring-green-400';  // Verde
  } else {
    return 'ring-2 ring-orange-400'; // Naranja (asignado)
  }
} else {
  // Lógica de apagado...
}
```

## 🎯 Casos de Uso Actualizados

### Ejemplo 1: Dispositivo Stand-by No Asignado
- **Estado**: `relayOn=true`, `currentPower=0`, `sin registro activo`
- **Color**: 🔵 Azul (stand-by no asignado)
- **Marco**: ❌ Sin marco
- **Significado**: Dispositivo encendido pero libre para asignar

### Ejemplo 2: Cita Normal Asignada
- **Inicio**: 🟠 Naranja (encendido, sin consumo, asignado)
- **Funcionando**: 🟢 Verde (consumiendo, dentro del tiempo)
- **Finalizado**: 🟣 Índigo (completado correctamente)

### Ejemplo 3: Conflicto de Asignación
- **Dispositivo consumiendo**: 🟢 Verde (para la cita asignada)
- **Otras citas**: 🔴 Rojo (ocupado por otra cita)
- **Disponibles**: 🔵 Azul (stand-by, libres)

## 🚨 Puntos Críticos Actualizados

1. **Diferenciación de asignación**: Azul = libre, Naranja = asignado a esta cita, Rojo = ocupado
2. **Margen de 15 segundos**: Evita falsos positivos por latencia
3. **Consumo real**: Solo `over_consuming` cuando hay watts reales
4. **Prioridad de marcos**: Dispositivo > Estados finales > Resize > Operación
5. **PowerThreshold**: SIEMPRE del equipamiento configurado

---

**Última actualización**: 11 de julio de 2025  
**Versión**: 3.2 - Stand-by no asignado + Margen 15s + Índigo completado 