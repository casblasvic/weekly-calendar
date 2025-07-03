# 🔌 SISTEMA DE ENCHUFES INTELIGENTES - ESTRATEGIA DE DOS NIVELES

## 📋 CONTEXTO DEL PROYECTO

**SaaS para gestión de clínicas y centros de belleza** con integración IoT para control de equipamiento médico mediante enchufes inteligentes Shelly.

### Funcionalidades Principales
- Control en tiempo real de dispositivos Shelly
- Umbrales de potencia configurables por equipo
- Switches de control: appointmentOnlyMode y autoShutdownEnabled  
- Integración con agenda de citas
- Dashboard de consumo energético

---

## 🚨 PROBLEMA ORIGINAL RESUELTO

### Síntomas Detectados
1. **Ping-pong Online/Offline**: Dispositivos oscilando cada 1-2 segundos
2. **Datos Fantasma**: Consumo "150W" mostrado indefinidamente cuando dispositivo offline
3. **Controles Fantasma**: Botones activos en dispositivos realmente desconectados
4. **Timer Agresivo**: Threshold de 1 segundo causaba inestabilidad

### Causa Raíz
- **WebSocket Shelly NO envía heartbeat** automático
- Solo envía `StatusOnChange` cuando hay cambios reales  
- Intervalos normales: 30 segundos a 2 minutos
- Timer de 1 segundo marcaba offline antes del siguiente mensaje legítimo

---

## ✅ SOLUCIÓN IMPLEMENTADA: ESTRATEGIA DE DOS NIVELES

### Filosofía del Diseño
**"Datos críticos limpian rápido, datos informativos toleran más tiempo"**

```
NIVEL 1 - CONSUMOS (5 segundos)     NIVEL 2 - ESTADOS (3 minutos)
├─ Datos críticos (dinero/seguridad)  ├─ Datos informativos (conectividad)
├─ Limpieza rápida                     ├─ Timeout conservador
├─ currentPower → null en 5s           ├─ online → offline en 3min  
└─ Previene datos fantasma             └─ Previene ping-pong
```

### Prioridad UI → BD
**GARANTIZADO**: UI se actualiza SIEMPRE primero, BD después
- WebSocket mensaje → UI inmediata → BD update
- Timeout consumo → UI inmediata → BD update  
- Timeout estado → UI inmediata → BD update

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### 1. DeviceOfflineManager (Singleton Central)
**Ubicación**: `lib/shelly/device-offline-manager.ts`

#### Responsabilidades
- Gestionar timeouts de ambos niveles
- Coordinar actualizaciones UI → BD
- Mantener estado centralizado
- Notificar callbacks suscritos

#### Maps Internos
```typescript
// NIVEL 1: Tracking de consumos individuales
deviceConsumptions = Map<deviceId, {
  watts: number;
  timestamp: number;
  timeoutId: NodeJS.Timeout;  // 5 segundos por consumo
}>

// NIVEL 2: Tracking de estados por dispositivo  
deviceStates = Map<deviceId, {
  online: boolean;
  lastSeenAt: number;  // Para verificación 3 minutos
}>
```

#### Timer Global de Estados
```typescript
stateCheckInterval: NodeJS.Timeout  // Cada 30 segundos
STATE_TIMEOUT = 3 * 60 * 1000       // 3 minutos threshold
```

### 2. WebSocket Manager Integration
**Ubicación**: `lib/shelly/websocket-manager.ts`

#### Flujo de Mensajes
```typescript
handleMessage() → handleDeviceStatusUpdate() → deviceOfflineManager.trackActivity()
```

#### Mapeo Automático de Dispositivos
- deviceId (BD) ↔ cloudId (Shelly) automático
- Búsqueda por deviceId, cloudId, MAC address
- Mapeo robusto que nunca falla

### 3. Socket.io Real-time Updates
**Ubicación**: `pages/api/socket.js`

#### Events Emitidos
```typescript
// Update específico por dispositivo
io.to(systemId).emit('device-offline-status', {
  deviceId, shellyDeviceId, online, relayOn, 
  currentPower, voltage, temperature, timestamp, reason
})

// Update de device status  
io.to(systemId).emit('device-status-update', updateData)
```

#### Room Strategy
- Room basado en `systemId` de la clínica
- Updates broadcast a todos los clientes de la clínica

---

## 🖥️ UI COMPONENTS QUE SE ACTUALIZAN

### 1. Tabla Principal de Enchufes
**Ubicación**: `app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx`

#### Indicadores Visuales
```jsx
// Datos válidos con consumo real
{hasValidConsumption && hasRealPower && (
  <span className="font-mono">{currentPower.toFixed(1)}W</span>
)}

// Sin datos válidos (timeout)
{!hasValidConsumption && (
  <span className="opacity-60">(...)</span>
)}
```

#### Columns Afectadas
- **Estado**: Badge ON/OFF con consumo
- **Solo desde citas**: Switch appointmentOnlyMode
- **Apagado automático**: Switch autoShutdownEnabled  
- **Acciones**: Botones control (desactivados si estado obsoleto)

### 2. Floating Menu
**Ubicación**: `components/ui/floating-menu.tsx`
**Hook**: `hooks/use-smart-plugs-floating-menu.ts`

#### Features
- Badge de consumo total en tiempo real
- Lista de dispositivos activos únicamente
- Controles de encendido/apagado
- Indicador de conexión WebSocket
- Auto-hide si no hay dispositivos válidos

#### Lógica de Filtrado
```typescript
// Solo dispositivos con datos válidos
activeDevices = clinicDevices.filter(device => {
  if (!device.online || !device.relayOn) return false;
  
  const hasValidConsumption = device.currentPower !== null && device.currentPower !== undefined;
  if (!hasValidConsumption) return false;
  
  const threshold = device.equipmentClinicAssignment?.equipment?.powerThreshold ?? 10.0;
  return device.currentPower > threshold;
});
```

### 3. Badges de Credenciales
**Ubicación**: Header de la tabla principal

#### Información Mostrada
- Estado conexión: connected/expired/error
- Consumo total en tiempo real
- Número de dispositivos activos
- Botón conectar WebSocket si desconectado

#### Cálculo de Consumo Total
```typescript
const credentialDevices = allPlugs.filter(plug => 
  plug.credentialId === credential.id && 
  plug.online && 
  plug.relayOn && 
  plug.currentPower !== null && 
  plug.currentPower !== undefined &&
  plug.currentPower > 0.1  // Solo consumo real y dato válido
);
```

### 4. Hooks de Gestión
- `useSocket()`: Suscripciones WebSocket
- `useSmartPlugsFloatingMenu()`: Datos para floating menu
- `useShellyRealtime()`: Updates en tiempo real

---

## 💾 DATABASE SCHEMA ACTUALIZADO

### Nuevos Campos Añadidos

#### Equipment Table
```sql
ALTER TABLE Equipment ADD COLUMN powerThreshold DECIMAL(10,1) DEFAULT 10.0;
```

#### SmartPlugDevice Table  
```sql
ALTER TABLE SmartPlugDevice ADD COLUMN appointmentOnlyMode BOOLEAN DEFAULT TRUE;
ALTER TABLE SmartPlugDevice ADD COLUMN autoShutdownEnabled BOOLEAN DEFAULT TRUE;
```

### Migration Aplicada
`20250702184130_add_power_threshold_and_smart_plug_controls`

### Importación Prisma Consistente
**REGLA ABSOLUTA**: `import { prisma } from '@/lib/db';` en TODOS los archivos

---

## ⚡ FLUJO COMPLETO DE DATOS

### 1. Recepción de Mensaje WebSocket
```
Shelly Cloud → WebSocket Manager → DeviceOfflineManager.trackActivity()
```

### 2. Procesamiento Dual
```
NIVEL 1: handleConsumptionData()     NIVEL 2: handleDeviceState()
├─ Cancelar timeout anterior         ├─ Actualizar lastSeenAt  
├─ Crear timeout 5s                  ├─ Marcar online
└─ Almacenar watts + timestamp       └─ Log estado
```

### 3. Notificación Inmediata
```
notifyCallbacks() → UI Updates (múltiples componentes simultáneos)
```

### 4. Timeouts Automáticos
```
Timeout Consumo (5s):                Timer Estados (30s check):
├─ clearConsumptionData()            ├─ checkStaleStates()
├─ currentPower → null               ├─ Si >3min → offline
├─ hasValidConsumption → false       ├─ staleUpdates[]
└─ UI update + BD update             └─ UI update + BD update
```

---

## 🎯 CASOS DE USO RESUELTOS

### Caso 1: Datos Fantasma Eliminados
```
❌ ANTES: Dispositivo offline mostrando "150W" indefinidamente
✅ AHORA: 
  14:00:00 - Mensaje WebSocket → "150W" mostrado
  14:00:05 - Timeout consumo → "(...)" mostrado  
  14:03:00 - Timeout estado → dispositivo offline
```

### Caso 2: Controles Inteligentes
```
❌ ANTES: Botones activos en dispositivos offline
✅ AHORA:
  - Botones activos solo si lastSeen < 3min
  - Estados claramente indicados en UI
  - Feedback inmediato al usuario
```

### Caso 3: Ping-Pong Eliminado
```
❌ ANTES: Online/Offline cada 1-2 segundos  
✅ AHORA:
  - Estable por 3 minutos mínimo
  - 3min >> 30s-2min (intervalo normal Shelly)
  - Sin oscilaciones molestas
```

---

## 🔧 CONFIGURACIÓN DE TIMEOUTS

### Timeouts Optimizados
```typescript
CONSUMOS: 5 segundos      // Crítico - limpieza rápida
ESTADOS: 3 minutos        // Conservador - evita ping-pong  
VERIFICACIÓN: 30 segundos // Eficiente - no agresivo
SHELLY NORMAL: 30s-2min   // Referencia del sistema real
```

### Justificación de Valores
- **5s consumos**: Suficiente para detectar datos obsoletos sin afectar UX
- **3min estados**: Mayor que intervalos normales Shelly, evita false positives
- **30s check**: Balance entre responsividad y eficiencia de CPU

---

## 🚀 BENEFICIOS IMPLEMENTADOS

### Performance
- **UI instantánea**: Actualizaciones inmediatas sin bloqueos
- **BD eficiente**: Updates asíncronos no bloquean UI
- **CPU optimizado**: Timer cada 30s vs 1s anterior

### UX Mejorada  
- **Indicadores claros**: Usuario siempre sabe estado real
- **Sin frustraciones**: Controles no fallan inesperadamente
- **Datos confiables**: Nunca consumos fantasma

### Robustez
- **Anti-ping-pong**: Sistema estable sin oscilaciones
- **Mapeo robusto**: Nunca falla por dispositivos no encontrados
- **Graceful degradation**: Sistema funciona aunque falten algunos datos

---

## 🔍 DEBUGGING Y MONITORING

### Logs Implementados
```typescript
wsLogger.debug()   // Actividad detallada
wsLogger.verbose() // Estados de transición  
wsLogger.error()   // Errores críticos
```

### Stats Disponibles
```typescript
deviceOfflineManager.getStats() = {
  isWebSocketConnected: boolean;
  callbacks: number;
  consumptions: number;  // Tracking activo NIVEL 1
  states: number;        // Tracking activo NIVEL 2
}
```

### Eventos Clave para Debug
- `📡 [OfflineManager] Dispositivo activo` - Mensaje recibido
- `⚡ [OfflineManager] Consumo registrado` - Dato válido procesado
- `🧹 [OfflineManager] Limpiando consumo obsoleto` - Timeout 5s
- `🔴 [OfflineManager] Estado obsoleto` - Timeout 3min

---

## 📚 ARCHIVOS PRINCIPALES MODIFICADOS

### Core System
- `lib/shelly/device-offline-manager.ts` - Manager centralizado
- `lib/shelly/websocket-manager.ts` - Integración WebSocket
- `pages/api/socket.js` - Socket.io events

### UI Components  
- `app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx` - Tabla principal
- `components/ui/floating-menu.tsx` - Menú flotante
- `hooks/use-smart-plugs-floating-menu.ts` - Hook datos floating

### Database
- `prisma/schema.prisma` - Campos powerThreshold, appointmentOnlyMode, autoShutdownEnabled
- `prisma/migrations/20250702184130_*` - Migration aplicada

---

## 🎉 RESULTADO FINAL

**Sistema 100% funcional** con estrategia de dos niveles que garantiza:

✅ **UI siempre actualizada** en tiempo real  
✅ **Datos nunca fantasma** (máximo 5s vigencia)  
✅ **Estados estables** (no ping-pong)  
✅ **Controles inteligentes** (no fallos inesperados)  
✅ **Performance optimizada** (BD no bloquea UI)  
✅ **Debugging completo** (logs detallados)  

El sistema implementa **tiempo real puro** donde la UI tiene prioridad absoluta y la BD se sincroniza de forma asíncrona, proporcionando la mejor experiencia de usuario posible. 