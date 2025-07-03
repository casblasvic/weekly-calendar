# 🌐 Sistema de Control de Enchufes Inteligentes - Tiempo Real Puro

## 📋 **Resumen Ejecutivo**

Sistema implementado para control de enchufes inteligentes Shelly en tiempo real puro, sin timeouts artificiales ni crons. Basado completamente en eventos WebSocket para máxima responsividad.

---

## 🏗️ **Arquitectura del Sistema**

### **Componentes Principales**

1. **`WebSocket Manager`** (`lib/shelly/websocket-manager.ts`)
   - Conecta con API Shelly Cloud
   - Recibe mensajes en tiempo real de dispositivos
   - Delega al Device Offline Manager

2. **`Device Offline Manager`** (`lib/shelly/device-offline-manager.ts`)
   - Sistema centralizado de estados online/offline
   - Patrón Singleton para consistencia global
   - Notifica cambios a Socket.io

3. **`Socket.io Server`** (`pages/api/socket.js`)
   - Actualiza base de datos
   - Propaga cambios a todos los clientes web
   - Maneja eventos masivos y específicos

4. **`Frontend Hooks`**
   - Consumen updates en tiempo real
   - Actualizan UI automáticamente

---

## ⚡ **Casos de Uso - Tiempo Real Puro**

### **🟢 CASO 1: Mensaje WebSocket Recibido**

**Flujo**: `WebSocket Manager → Device Offline Manager → Socket.io → BD + Clientes`

```typescript
// 1. WebSocket Manager recibe datos
handleDeviceStatusUpdate() {
  deviceOfflineManager.trackActivity(device.id, device.name, updatedData);
}

// 2. Device Offline Manager notifica inmediatamente
trackActivity() {
  this.notifyCallbacks([{
    deviceId,
    online: true,
    reason: 'websocket_message_received',
    updateBD: true, // ✅ Actualiza BD
    deviceData: { relayOn, currentPower, voltage, temperature }
  }]);
}

// 3. Socket.io actualiza BD y propaga
await prisma.smartPlugDevice.update({
  where: { id: device.id },
  data: {
    online: true,
    relayOn: deviceData.relayOn,
    currentPower: deviceData.currentPower,
    voltage: deviceData.voltage,
    temperature: deviceData.temperature,
    lastSeenAt: new Date()
  }
});
```

**Resultado**: Dispositivo marcado online inmediatamente + BD actualizada + UI actualizada

---

### **🔴 CASO 2: WebSocket Desconectado**

**Flujo**: `WebSocket Manager → Device Offline Manager → Socket.io → BD + Clientes`

```typescript
// 1. WebSocket Manager detecta desconexión
handleClose() {
  deviceOfflineManager.setWebSocketConnected(false);
}

// 2. Device Offline Manager marca todos offline
setWebSocketConnected(false) {
  this.markAllOfflineImmediate(); // updateBD: true
}

// 3. Socket.io actualiza BD masivamente
await prisma.smartPlugDevice.updateMany({
  data: {
    online: false,
    relayOn: false,
    currentPower: 0,
    lastSeenAt: new Date()
  }
});
```

**Resultado**: Todos los dispositivos marcados offline + BD actualizada + UI actualizada

---

### **🔄 CASO 3: WebSocket Reconectado**

**Flujo**: `WebSocket Manager → Device Offline Manager → Socket.io → Solo UI`

```typescript
// 1. WebSocket Manager detecta reconexión
handleOpen() {
  deviceOfflineManager.setWebSocketConnected(true);
}

// 2. Device Offline Manager resetea UI
setWebSocketConnected(true) {
  this.notifyCallbacks([{
    deviceId: 'ALL',
    online: true,
    reason: 'websocket_reconnected',
    updateBD: false // ❌ NO actualiza BD
  }]);
}
```

**Resultado**: Solo reset visual, BD no se toca (los mensajes posteriores actualizarán estados reales)

---

## 🎯 **Lugares Donde Se Usa**

### **1. 📱 Tabla de Enchufes Inteligentes**
**Archivo**: `app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx`

```typescript
// Hook que consume estados en tiempo real
const { data: devices } = useSmartPlugDevices();

// Columna "Online" muestra estado actual
{device.online ? (
  <Badge variant="success">Online</Badge>
) : (
  <Badge variant="destructive">Offline</Badge>
)}
```

### **2. 🎛️ Menú Flotante de Enchufes** 
**Hook**: `hooks/use-smart-plugs-floating-menu.ts`

```typescript
// Filtra solo dispositivos online para control
const availableDevices = devices?.filter(device => 
  device.online && device.appointmentOnlyMode
);
```

### **3. 📅 Citas - Dropdown de Equipamiento**
**Componente**: `components/appointment-equipment-dropdown.tsx`

```typescript
// Muestra disponibilidad basada en estado online
const isAvailable = assignment.smartPlugDevices?.some(plug => 
  plug.online
);
```

---

## 💾 **Actualización de Base de Datos**

### **✅ SÍ actualiza BD:**
- **Mensaje WebSocket recibido** → Dispositivo realmente online + todos sus datos
- **WebSocket desconectado** → Dispositivos realmente offline

### **❌ NO actualiza BD:**
- **WebSocket reconectado** → Solo reset visual (los mensajes posteriores actualizarán)

---

## 🔧 **Configuración de Umbrales y Controles**

### **Umbrales de Potencia**
```typescript
// Campo en tabla Equipment
powerThreshold: Decimal // Default: 10.0W

// En modal de equipamiento
<Input
  type="number"
  step="0.1"
  defaultValue="10.0"
  name="powerThreshold"
  placeholder="Umbral en Watts"
/>
```

### **Switches de Control**
```typescript
// Campos en tabla SmartPlugDevice
appointmentOnlyMode: Boolean // Default: true
autoShutdownEnabled: Boolean // Default: true

// En tabla de enchufes
<Switch
  checked={device.appointmentOnlyMode}
  onCheckedChange={(checked) => 
    toggleAppointmentOnlyMode(device.id, checked)
  }
/>
```

---

## 📡 **Filosofía: Tiempo Real Puro**

### **❌ NO usamos:**
- Timeouts artificiales (30s, 45s, etc.)
- Polling periódico
- Crons o timers
- Verificaciones por tiempo

### **✅ SÍ usamos:**
- Eventos WebSocket inmediatos
- Heartbeat del sistema Shelly
- Confianza en datos en tiempo real
- Actualización solo cuando hay eventos reales

---

## 🚨 **Principios Críticos**

1. **WebSocket conectado = confiar en tiempo real**
   - Cada mensaje = dispositivo online inmediato
   - Sin timeouts artificiales

2. **WebSocket desconectado = problema real**
   - Marcar todos offline inmediatamente
   - Actualizar BD por ser situación real

3. **Reconexión = solo reset visual**
   - No asumir estados
   - Esperar mensajes reales posteriores

4. **BD siempre sincronizada**
   - Solo actualizar en eventos reales
   - Nunca en resets visuales

5. **🔧 ROBUSTEZ ANTE ERRORES (CRÍTICO)**
   - UN dispositivo no encontrado NO rompe TODO el sistema
   - trackActivity() se ejecuta SIEMPRE (con datos específicos o genéricos)
   - Logging separado para debugging sin romper flujo
   - Graceful degradation: sistema funciona aunque falten dispositivos específicos

---

## 🔍 **Debug y Monitoreo**

### **Logs de WebSocket**
```typescript
// Archivo: lib/utils/websocket-logger.ts
wsLogger.verbose('🔄 [OfflineManager] Dispositivo online en tiempo real');
wsLogger.verbose('📡 [TIEMPO REAL] Datos enviados al sistema centralizado');
```

### **Verificar Estados**
```typescript
// En DevTools Console
deviceOfflineManager.getStats()
// Returns: { isWebSocketConnected: boolean, callbacks: number }
```

---

## 🎛️ **APIs Relacionadas**

### **Control de Dispositivos**
- `POST /api/internal/smart-plug-devices/[id]/toggle-appointment-only`
- `POST /api/internal/smart-plug-devices/[id]/toggle-auto-shutdown`

### **Estados y Configuración**
- `GET /api/equipment/clinic-assignments/by-services` (incluye powerThreshold)
- `GET /api/internal/smart-plug-devices` (incluye appointmentOnlyMode, autoShutdownEnabled)

---

## 🔄 **Migración de BD Aplicada**

**Archivo**: `prisma/migrations/20250702184130_add_power_threshold_and_smart_plug_controls/`

```sql
-- Umbrales de potencia
ALTER TABLE "Equipment" ADD COLUMN "powerThreshold" DECIMAL(10,2) NOT NULL DEFAULT 10.0;

-- Controles de enchufe
ALTER TABLE "SmartPlugDevice" ADD COLUMN "appointmentOnlyMode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SmartPlugDevice" ADD COLUMN "autoShutdownEnabled" BOOLEAN NOT NULL DEFAULT true;
```

---

## 🚨 **CORRECCIÓN CRÍTICA APLICADA**

### **Problema Original (RESUELTO)**
```typescript
// ❌ CÓDIGO ANTERIOR - ROMPÍA TODO EL SISTEMA
if (device) {
    deviceOfflineManager.trackActivity(device.id, device.name, updatedData);
} else {
    console.log(`⚠️ No se encontró dispositivo ${deviceId}`);
    // 🚨 AQUÍ SE SALÍA SIN LLAMAR trackActivity() !!!
}
```

**Consecuencia**: Si UN dispositivo no se encontraba en BD, TODA la lógica se rompía.

### **Solución Implementada**
```typescript
// ✅ CÓDIGO ACTUAL - SIEMPRE FUNCIONA
const device = await prisma.smartPlugDevice.findFirst({...});

if (device) {
    // Datos específicos del dispositivo
    deviceOfflineManager.trackActivity(device.id, device.name, updatedData);
} else {
    // Datos genéricos pero MANTIENE LA LÓGICA
    deviceOfflineManager.trackActivity(`unknown_${deviceId}`, `Dispositivo ${deviceId}`, updatedData);
}

// 🎯 trackActivity() se ejecuta SIEMPRE
```

**Resultado**: Sistema robusto que funciona aunque haya dispositivos no mapeados correctamente.

---

## ✅ **ACTUALIZACIÓN CRÍTICA V3.0 - SISTEMA RESILIENTE**

### 🚨 **PROBLEMA RESUELTO**: Sistema se Rompía por Dispositivo No Mapeado

**Situación anterior**:
- WebSocket recibía datos del dispositivo `79530328999834`
- Sistema no lo encontraba en BD (problema de mapeo MAC case-sensitive)
- Ejecutaba `return;` → **NO llamaba `trackActivity()`**
- Device Offline Manager no se enteraba → Socket.io no actualizaba → Tabla se quedaba offline

### 🔧 **SOLUCIÓN IMPLEMENTADA**

#### **1. Mapeo Inteligente Mejorado**
```typescript
// 🎯 ESTRATEGIA 1: MAC desde status
const macFromStatus = status.mac; // "48551902479A"
// Busca: 48551902479a, 48551902479A en deviceId y cloudId

// 🎯 ESTRATEGIA 2: deviceId como MAC  
// Si deviceId parece MAC, buscar variaciones case-insensitive

// 🎯 ESTRATEGIA 3: cloudId
// Buscar por cloudId en todos los dispositivos
```

#### **2. Sistema Resiliente - NUNCA se Rompe**
```typescript
// ❌ ANTES (ROTO)
if (!device) {
    return; // ← Esto rompía TODO el sistema
}

// ✅ AHORA (FUNCIONA SIEMPRE)
if (!device) {
    // Ejecutar trackActivity genérico para mantener sistema vivo
    deviceOfflineManager.trackActivity(`unmapped_${deviceId}`, ...);
}
```

#### **3. Resultado**
- **✅ Si encuentra dispositivo**: Procesamiento normal con datos específicos
- **✅ Si NO encuentra**: Sistema sigue funcionando con datos genéricos
- **✅ Tabla siempre actualizada**: Un dispositivo problemático NO rompe el conjunto
- **✅ BD sincronizada**: Updates reales llegan correctamente

---

Este sistema garantiza **tiempo real puro y resiliente** sin comprometer la performance, manteniendo la BD siempre sincronizada y proporcionando UX inmediata incluso con dispositivos problemáticos. 