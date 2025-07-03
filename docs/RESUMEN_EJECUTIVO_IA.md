# ⚡ RESUMEN EJECUTIVO - SISTEMA ENCHUFES INTELIGENTES (PARA IA)

## 🎯 CONTEXTO EN 30 SEGUNDOS

**SaaS clínicas** + **Dispositivos Shelly IoT** + **Control enchufes inteligentes** en tiempo real.

**PROBLEMA RESUELTO**: Ping-pong online/offline + consumos fantasma por timer 1s agresivo.

**SOLUCIÓN IMPLEMENTADA**: **Estrategia de Dos Niveles** con timeouts diferenciados.

---

## 🔥 ESTRATEGIA DE DOS NIVELES

```
NIVEL 1: CONSUMOS (5 segundos)          NIVEL 2: ESTADOS (3 minutos)
├─ currentPower → null tras 5s sin data ├─ online → offline tras 3min sin data
├─ Crítico (dinero/seguridad)           ├─ Informativo (conectividad) 
├─ Evita datos fantasma                 ├─ Evita ping-pong
└─ UI muestra (...) si timeout          └─ Controles se desactivan
```

---

## 📁 ARCHIVOS CLAVE

### Core Engine
- `lib/shelly/device-offline-manager.ts` - **Singleton centralizado, gestiona ambos niveles**
- `lib/shelly/websocket-manager.ts` - **Integración con Shelly WebSocket**
- `pages/api/socket.js` - **Socket.io real-time events**

### UI Components (4 actualizados)
- `app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx` - **Tabla principal**
- `components/ui/floating-menu.tsx` - **Menú flotante**
- `hooks/use-smart-plugs-floating-menu.ts` - **Hook datos floating**
- Badges de credenciales (en tabla principal)

### Database
- `prisma/schema.prisma` - **Campos: powerThreshold, appointmentOnlyMode, autoShutdownEnabled**
- `prisma/migrations/20250702184130_*` - **Migration aplicada**

---

## ⚡ FLUJO DE DATOS

```
Shelly WebSocket → WebSocket Manager → DeviceOfflineManager → 
UI Updates (4 componentes) → BD Updates (asíncrono)
```

**PRIORIDAD ABSOLUTA**: UI INMEDIATA → BD DESPUÉS

---

## 🔧 TIMEOUTS CONFIGURADOS

```typescript
// INDIVIDUAL: Timeouts por consumo
setTimeout(() => clearConsumptionData(deviceId), 5000)

// GLOBAL: Timer para estados  
setInterval(() => checkStaleStates(), 30000)  // Check cada 30s
STATE_TIMEOUT = 3 * 60 * 1000                // Threshold 3min
```

---

## 💾 MAPAS INTERNOS (DeviceOfflineManager)

```typescript
// NIVEL 1: Tracking consumos individuales
deviceConsumptions = Map<deviceId, {watts, timestamp, timeoutId}>

// NIVEL 2: Tracking estados globales
deviceStates = Map<deviceId, {online, lastSeenAt}>
```

---

## 🖥️ INDICADORES VISUALES

```jsx
// Dato válido con consumo
{hasValidConsumption && hasRealPower && (
  <span>{currentPower.toFixed(1)}W</span>
)}

// Sin dato válido (timeout 5s)
{!hasValidConsumption && (
  <span className="opacity-60">(...)</span>
)}
```

---

## 📡 EVENTS SOCKET.IO

```typescript
// Event principal propagado a UI
io.to(systemId).emit('device-offline-status', {
  deviceId, online, relayOn, currentPower, 
  voltage, temperature, timestamp, reason
})

// Reasons: websocket_message_received, consumption_timeout, 
//          state_timeout, websocket_disconnected
```

---

## 🎯 ENTRY POINTS (Para debugging)

### 1. Mensaje WebSocket recibido
```typescript
deviceOfflineManager.trackActivity(deviceId, deviceName, deviceData)
```

### 2. Timeout consumo (5s)
```typescript
clearConsumptionData(deviceId) → currentPower=null → UI update
```

### 3. Timeout estado (3min)
```typescript
checkStaleStates() → online=false → UI update
```

### 4. WebSocket desconectado
```typescript
markAllOfflineImmediate() → todos offline → UI update
```

---

## 🚨 CASOS RESUELTOS

| Problema Original | Solución Implementada |
|---|---|
| "150W" mostrado indefinidamente cuando offline | currentPower→null tras 5s, UI muestra "(...)" |
| Botones activos en dispositivos offline | Controles desactivados si lastSeen > 3min |
| Online/Offline cada 1-2 segundos (ping-pong) | 3min threshold >> 30s-2min normal Shelly |

---

## 🔍 DEBUGGING RÁPIDO

```bash
# Logs clave para buscar
📡 [OfflineManager] Dispositivo activo    # Mensaje recibido
⚡ [OfflineManager] Consumo registrado     # Dato válido
🧹 [OfflineManager] Limpiando consumo      # Timeout 5s
🔴 [OfflineManager] Estado obsoleto        # Timeout 3min
```

```typescript
// Stats en runtime
deviceOfflineManager.getStats() = {
  isWebSocketConnected, callbacks, consumptions, states
}
```

---

## ✅ RESULTADO

**Sistema 100% estable** que elimina ping-pong y datos fantasma, con UI instantánea y BD asíncrona.

**Filosofía**: "UI primero, BD después, datos críticos limpian rápido, datos informativos toleran más" 