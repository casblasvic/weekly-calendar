# 📝 COMENTARIOS DE CÓDIGO ACTUALIZADOS - SISTEMA ENCHUFES INTELIGENTES

## 🎯 CONTEXTO PARA IA

Si una IA entra a revisar este código, debe entender que se implementó una **ESTRATEGIA DE DOS NIVELES** para resolver problemas de ping-pong y datos fantasma en enchufes inteligentes Shelly.

---

## 🔧 COMENTARIOS ACTUALIZADOS POR ARCHIVO

### 1. `lib/shelly/device-offline-manager.ts`

#### Header del Archivo (ACTUALIZADO)
```typescript
/**
 * 🎯 DEVICE OFFLINE MANAGER - ESTRATEGIA DE DOS NIVELES
 * 
 * PROBLEMA RESUELTO: Ping-pong online/offline + datos de consumo fantasma
 * 
 * SOLUCIÓN:
 * ├─ NIVEL 1: Consumos (5 segundos) - Datos críticos, limpieza rápida
 * ├─ NIVEL 2: Estados (3 minutos) - Datos informativos, timeout conservador
 * └─ PRIORIDAD: UI INMEDIATA → BD DESPUÉS (siempre)
 * 
 * FLUJO DE TIMEOUTS:
 * ├─ WebSocket mensaje → trackActivity() → UI inmediata + programar timeouts
 * ├─ Timeout consumo (5s) → clearConsumptionData() → currentPower=null → UI+BD
 * ├─ Timeout estado (3min) → checkStaleStates() → online=false → UI+BD
 * └─ WebSocket desconectado → markAllOffline() → UI+BD
 * 
 * MAPEO INTERNO:
 * ├─ deviceConsumptions: Map<deviceId, {watts, timestamp, timeoutId}>
 * ├─ deviceStates: Map<deviceId, {online, lastSeenAt}>
 * └─ stateCheckInterval: Timer global cada 30s, threshold 3min
 */
```

#### Comentarios de Métodos Clave
```typescript
/**
 * 🟢 ENTRADA PRINCIPAL - Llamado desde WebSocket Manager en cada mensaje Shelly
 * 
 * SECUENCIA:
 * 1. handleConsumptionData() → Programa timeout 5s para limpiar consumo
 * 2. handleDeviceState() → Actualiza lastSeenAt para verificación 3min
 * 3. notifyCallbacks() → UI INMEDIATA en todos los componentes
 * 4. updateBD: true → BD se actualiza DESPUÉS de UI (asíncrono)
 */
trackActivity(deviceId: string, deviceName?: string, deviceData?: any): void

/**
 * 🎯 NIVEL 1: Gestión de datos de consumo críticos (5 segundos)
 * 
 * LÓGICA:
 * ├─ Si hay currentPower → Cancelar timeout anterior + Crear nuevo timeout 5s
 * ├─ Si NO hay datos → No programar timeout (mantener estado actual)
 * └─ Timeout ejecuta clearConsumptionData() → currentPower=null + UI update
 */
private handleConsumptionData(deviceId: string, currentPower?: number, timestamp?: number): void

/**
 * 🎯 NIVEL 2: Gestión de estados informativos (3 minutos)
 * 
 * LÓGICA:
 * ├─ Actualizar lastSeenAt en deviceStates Map
 * ├─ Timer global cada 30s ejecuta checkStaleStates()
 * └─ Si (now - lastSeenAt) > 3min → Marcar offline + UI update
 */
private handleDeviceState(deviceId: string, online: boolean, timestamp?: number): void

/**
 * 🔍 VERIFICACIÓN AUTOMÁTICA - Ejecutado cada 30 segundos por timer global
 * 
 * LÓGICA:
 * ├─ Iterar deviceStates Map
 * ├─ Calcular timeSinceLastSeen = now - lastSeenAt
 * ├─ Si online && timeSinceLastSeen > 3min → Marcar offline
 * └─ notifyCallbacks() → UI INMEDIATA + BD update
 */
private async checkStaleStates(): Promise<void>
```

---

### 2. `app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx`

#### Comentarios de Componente Principal
```jsx
/**
 * 🔌 TABLA PRINCIPAL DE ENCHUFES INTELIGENTES
 * 
 * INTEGRACIÓN CON ESTRATEGIA DOS NIVELES:
 * ├─ useSocket() → Suscripción a device-offline-status events
 * ├─ subscribe() callback → Actualiza state local inmediatamente
 * ├─ UI re-render → Refleja cambios en tiempo real
 * └─ hasValidConsumption logic → Detecta timeouts de consumo
 * 
 * UPDATES RECIBIDOS:
 * ├─ websocket_message_received → Datos frescos de Shelly
 * ├─ consumption_timeout → currentPower=null después de 5s
 * ├─ state_timeout → online=false después de 3min
 * └─ websocket_disconnected → Todos offline
 */
const SmartPlugsPage = () => {
```

#### Comentarios de Lógica de Estado
```jsx
// ✅ ESTRATEGIA DOS NIVELES: Detectar validez de datos de consumo
const hasValidConsumption = plug.currentPower !== null && plug.currentPower !== undefined;
const hasRealPower = hasValidConsumption && plug.currentPower > 0.1;

// ✅ INDICADORES VISUALES según estado de datos
{hasValidConsumption && hasRealPower && (
  // Mostrar consumo real con datos válidos
  <span className="font-mono">{plug.currentPower!.toFixed(1)}W</span>
)}

{!hasValidConsumption && (
  // Indicar ausencia de datos válidos (timeout de 5s ejecutado)
  <span className="text-xs opacity-60">(...)</span>
)}
```

#### Comentarios de Update Logic
```jsx
// ✅ VERIFICACIÓN DE CAMBIOS: Incluye currentPower=null como cambio válido
const hasChanges = (
  Boolean(oldDevice.online) !== Boolean(update.online) ||
  Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
  // Para currentPower, considerar null como un cambio válido (timeout de consumo)
  (oldDevice.currentPower !== update.currentPower) ||
  Number(oldDevice.voltage || 0) !== Number(update.voltage || 0) ||
  Number(oldDevice.temperature || 0) !== Number(update.temperature || 0)
);
```

---

### 3. `components/ui/floating-menu.tsx`

#### Comentarios de Floating Menu
```jsx
/**
 * 🎈 FLOATING MENU - ENCHUFES INTELIGENTES
 * 
 * INTEGRACIÓN DOS NIVELES:
 * ├─ useSmartPlugsFloatingMenu() → Hook con lógica filtrado
 * ├─ activeDevices → Solo dispositivos con datos válidos + consumo real
 * ├─ totalPower → Suma solo dispositivos con hasValidConsumption
 * └─ UI updates → Tiempo real via deviceOfflineManager callbacks
 * 
 * FILTRADO INTELIGENTE:
 * ├─ device.online && device.relayOn → Estados básicos
 * ├─ hasValidConsumption → currentPower !== null (no timeout)
 * └─ currentPower > threshold → Consumo real por encima de umbral
 */
```

#### Comentarios de Renderizado
```jsx
// ✅ ESTRATEGIA DOS NIVELES: Solo mostrar consumo si hay dato válido
{device.online && isActive && hasValidConsumption && hasRealPower && (
  <>
    <Zap className="w-3 h-3 text-yellow-300" />
    <span className="font-mono text-xs font-medium">
      {device.currentPower!.toFixed(1)}W
    </span>
  </>
)}

// ✅ INDICADOR VISUAL: Está ON pero sin dato válido (timeout consumo)
{device.online && isActive && !hasValidConsumption && (
  <span className="text-xs opacity-60 ml-1">(...)</span>
)}
```

---

### 4. `hooks/use-smart-plugs-floating-menu.ts`

#### Comentarios de Hook
```typescript
/**
 * 🪝 HOOK FLOATING MENU - INTEGRACIÓN ESTRATEGIA DOS NIVELES
 * 
 * RESPONSABILIDADES:
 * ├─ Suscripción a deviceOfflineManager callbacks
 * ├─ Filtrado de dispositivos con datos válidos
 * ├─ Cálculo de consumo total confiable
 * └─ Update inmediato de UI en cambios de estado
 * 
 * FILTROS APLICADOS:
 * ├─ activeDevices → Solo online + relayOn + hasValidConsumption + >threshold
 * ├─ deviceStats.consuming → Cuenta dispositivos con datos válidos únicamente
 * └─ totalPower → Suma solo currentPower válidos (no null/undefined)
 */
```

#### Comentarios de Filtrado
```typescript
// ✅ ESTRATEGIA DOS NIVELES: Solo incluir dispositivos con datos válidos
const activeDevices = useMemo(() => {
  return clinicDevices.filter(device => {
    if (!device.online || !device.relayOn) return false;
    
    // CRÍTICO: Solo incluir si hay dato válido de consumo (no timeout)
    const hasValidConsumption = device.currentPower !== null && device.currentPower !== undefined;
    if (!hasValidConsumption) return false;
    
    // Aplicar threshold específico del equipment
    const threshold = device.equipmentClinicAssignment?.equipment?.powerThreshold ?? 10.0;
    return device.currentPower > threshold;
  });
}, [clinicDevices]);
```

---

### 5. `lib/shelly/websocket-manager.ts`

#### Comentarios de Integración
```typescript
/**
 * 🔗 INTEGRACIÓN CON DEVICE OFFLINE MANAGER
 * 
 * FLUJO:
 * ├─ handleMessage() → Mensaje Shelly recibido
 * ├─ handleDeviceStatusUpdate() → Procesamiento + mapeo automático
 * ├─ deviceOfflineManager.trackActivity() → Activar estrategia dos niveles
 * └─ UI updates propagados a todos los componentes suscritos
 */
public async handleDeviceStatusUpdate(
  credentialId: string, 
  deviceId: string, 
  status: any
): Promise<void> {
  // ... mapeo de dispositivo ...
  
  // 🎯 ACTIVAR ESTRATEGIA DOS NIVELES - Siempre llamar sin importar si se encuentra dispositivo
  deviceOfflineManager.trackActivity(device.id, device.name, updatedData);
}
```

---

## 🚀 RESUMEN PARA IA

### Puntos Clave para Entender el Sistema

1. **PROBLEMA ORIGINAL**: Timer 1s causaba ping-pong + datos fantasma
2. **SOLUCIÓN**: Dos niveles con timeouts diferentes (5s consumos, 3min estados)
3. **PRIORIDAD**: UI siempre primero, BD después (asíncrono)
4. **COMPONENTES**: 4 UIs se actualizan en tiempo real
5. **MAPEO**: deviceId ↔ cloudId automático, robusto
6. **EVENTS**: Socket.io device-offline-status propagado
7. **LOGS**: wsLogger con debug/verbose/error levels
8. **MIGRATION**: Campos powerThreshold, appointmentOnlyMode, autoShutdownEnabled

### Flujo Completo
```
Shelly WebSocket → WebSocket Manager → DeviceOfflineManager → 
notifyCallbacks() → [Tabla + FloatingMenu + Badges + Hook] → UI Updates → BD Updates
```

### Timeouts Activos
- **Individual por consumo**: 5 segundos (clearTimeout + setTimeout)
- **Global para estados**: Timer 30s check, threshold 3min
- **WebSocket**: Reconectar automático si se desconecta

### Estados de currentPower
- **Número válido**: Dato fresco de Shelly
- **null**: Timeout de 5s ejecutado, no hay dato válido
- **undefined**: Nunca inicializado

Esta documentación permite a cualquier IA entender rápidamente el sistema y continuar el desarrollo sin perder contexto. 