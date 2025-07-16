# 🌐 ARQUITECTURA WEBSOCKET COMPLETA - SISTEMA DE TIEMPO REAL

## 📋 **Resumen Ejecutivo**

Sistema completo de WebSocket implementado para el SaaS de clínicas y centros de belleza, que proporciona tiempo real puro sin timers artificiales. Basado en eventos WebSocket inmediatos con arquitectura centralizada y escalable.

---

## 🏗️ **Arquitectura del Sistema**

### **Componentes Principales**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA CENTRALIZADA                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                WebSocketProvider                        │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              UNA SOLA CONEXIÓN useSocket       │    │    │
│  │  │                  (Socket.io)                   │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                       │                                 │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │           SISTEMA DE SUSCRIPCIÓN               │    │    │
│  │  │    subscribersRef.current.set(id, callback)    │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│     │ Component A │  │ Component B │  │ Component C │          │
│     │ subscribe() │  │ subscribe() │  │ subscribe() │          │
│     └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### **1. WebSocket Manager** (`lib/shelly/websocket-manager.ts`)
- **Función**: Conecta con API Shelly Cloud y dispositivos
- **Características**:
  - Recibe mensajes en tiempo real de dispositivos
  - Manejo robusto de reconexiones
  - Delega procesamiento al Device Offline Manager
  - Integración con sistema de credenciales

### **2. Device Offline Manager** (`lib/shelly/device-offline-manager.ts`)
- **Función**: Sistema centralizado de estados online/offline
- **Características**:
  - Patrón Singleton para consistencia global
  - Detección en tiempo real de cambios de estado
  - Notificación inmediata a Socket.io
  - Manejo de timeouts inteligentes

### **3. Socket.io Server** (`pages/api/socket.js`)
- **Función**: Servidor central de comunicación en tiempo real
- **Características**:
  - Manejo de rooms por systemId (multi-tenant)
  - Integración con Redis Adapter para escalabilidad
  - Global broadcast functions
  - Puente a servidor externo (Railway)

### **4. WebSocket Provider** (`contexts/websocket-context.tsx`)
- **Función**: Contexto centralizado para toda la aplicación
- **Características**:
  - Una sola conexión WebSocket por usuario
  - Sistema de suscripción centralizado
  - Eliminación completa de ghost sockets
  - Propagación automática a todos los componentes
  - **🚀 INICIALIZACIÓN AUTOMÁTICA**: Inicia WebSockets automáticamente al autenticarse

---

## ⚡ **Flujo de Datos en Tiempo Real**

### **Flujo Principal:**
```
Shelly Device → WebSocket Manager → Device Offline Manager → Socket.io Server → WebSocketProvider → Components
```

### **Casos de Uso Críticos:**

#### **🟢 Mensaje WebSocket Recibido**
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

#### **🔴 WebSocket Desconectado**
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

---

## 🗄️ **Estructura de Base de Datos**

### **Tabla WebSocketConnection**
```sql
model WebSocketConnection {
  id            String   @id @default(cuid())
  type          String   // "SHELLY", "SOCKET_IO", "CUSTOM", "TEST"
  referenceId   String   // credentialId para Shelly, systemId para Socket.io
  status        String   // "connected", "disconnected", "error", "reconnecting"
  lastPingAt    DateTime?
  errorMessage  String?
  metadata      Json?
  autoReconnect Boolean  @default(true) // 🔑 CONTROL DE RECONEXIÓN
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  logs          WebSocketLog[]
  @@unique([type, referenceId])
}
```

### **Tabla WebSocketLog**
```sql
model WebSocketLog {
  id               String    @id @default(cuid())
  connectionId     String
  eventType        String    // "connect", "disconnect", "error", "message", "action"
  message          String?   @db.Text
  errorDetails     String?   @db.Text
  metadata         Json?
  responseTime     Int?
  dataSize         Int?
  createdAt        DateTime  @default(now())
}
```

---

## 🔧 **Configuración del Sistema**

### **Variables de Entorno**
```env
# WebSocket Principal
NEXT_PUBLIC_WS_URL=https://socket-server-qleven.up.railway.app
NEXTAUTH_URL=https://tu-dominio.com

# Redis para Escalabilidad
REDIS_URL=redis://...

# Logging (Opcional)
WEBSOCKET_DEBUG=true
WEBSOCKET_VERBOSE=true

# Límites de Rendimiento
WEBSOCKET_MAX_MESSAGES_PER_MINUTE=60
WEBSOCKET_RATE_LIMIT_WINDOW=60000
```

### **Configuración Socket.io**
```typescript
// Para Vercel (sin WebSocket nativo)
const socketConfig = {
  transports: ['polling', 'websocket'],  // Fallback a polling
  upgrade: true,                         // Upgrade si es posible
  reconnectionAttempts: 10,              // Límite de reintentos
  reconnectionDelay: 3000,               // 3s inicial
  reconnectionDelayMax: 30000,           // Máximo 30s
  randomizationFactor: 0.5,              // Evitar thundering herd
  timeout: 30000,                        // 30s para cold starts
  forceNew: false,
  autoConnect: true
};
```

---

## 🎯 **Uso en Componentes**

### **Hook Principal (Obligatorio)**
```typescript
import { useWebSocket } from '@/contexts/websocket-context';

function MyComponent() {
  const { isConnected, subscribe, requestDeviceUpdate } = useWebSocket();
  
  useEffect(() => {
    if (!isConnected) return;
    
    const unsubscribe = subscribe((payload: any) => {
      // Procesar datos en tiempo real
      console.log('Datos recibidos:', payload);
    });
    
    return unsubscribe;
  }, [subscribe, isConnected]);
}
```

### **Hook Opcional (Componentes que pueden funcionar sin WebSocket)**
```typescript
import { useWebSocketOptional } from '@/contexts/websocket-context';

function OptionalComponent() {
  const websocketContext = useWebSocketOptional();
  const { subscribe, isConnected } = websocketContext || { 
    subscribe: () => () => {}, 
    isConnected: false 
  };
  
  // Componente funciona aunque no haya WebSocket
}
```

---

## 📊 **Lugares de Uso Críticos**

### **1. Tabla de Enchufes Inteligentes**
```typescript
// Archivo: app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx
const { data: devices } = useSmartPlugDevices();

// Columna "Online" muestra estado en tiempo real
{device.online ? (
  <Badge variant="success">Online</Badge>
) : (
  <Badge variant="destructive">Offline</Badge>
)}
```

### **2. Menú Flotante de Enchufes**
```typescript
// Hook: hooks/use-smart-plugs-floating-menu.ts
const availableDevices = devices?.filter(device => 
  device.online && device.appointmentOnlyMode
);
```

### **3. Agenda - Appointment Items**
```typescript
// Componente: components/appointment-item.tsx
const { subscribe, isConnected } = useWebSocket();

useEffect(() => {
  if (!isConnected) return;
  
  const unsubscribe = subscribe((payload: any) => {
    if (payload.type === 'device-update') {
      // Actualizar estado del appointment
    }
  });
  
  return unsubscribe;
}, [subscribe, isConnected]);
```

---

## 🔍 **Control de Logs y Debugging**

### **Configuración de Logs**

#### **Servidor (Variables de Entorno)**
```bash
# Habilita logs detallados
WEBSOCKET_DEBUG=true
WEBSOCKET_VERBOSE=true
```

#### **Cliente (Consola del Navegador)**
```javascript
// Habilitar logs verbosos
enableWebSocketLogs()

// Habilitar debug completo
enableWebSocketDebug()

// Deshabilitar logs
disableWebSocketLogs()
```

### **Niveles de Logging**

#### **Siempre Visibles**
- ✅ Logs de éxito importantes
- ❌ Logs de error críticos
- ⚠️ Logs de advertencia

#### **Verbose** (`WEBSOCKET_VERBOSE=true`)
- 📡 StatusOnChange de dispositivos
- 💾 Actualizaciones de base de datos
- 📤 Envío de updates por WebSocket
- 🔄 Mapeo automático de dispositivos

#### **Debug** (`WEBSOCKET_DEBUG=true`)
- 🔍 Mensajes WebSocket crudos
- 🔍 Eventos no reconocidos
- 🔍 Datos detallados de switches

---

## 🛡️ **Prevención de Problemas Conocidos**

### **🚨 Bucles Infinitos (PREVENIDO)**
```typescript
// ❌ NUNCA HACER: Múltiples instancias de useSocket
// Esto causaba bucles infinitos de API calls

// ✅ CORRECTO: Usar contexto centralizado
const websocketContext = useWebSocketOptional();
```

### **🚨 Ghost Sockets (PREVENIDO)**
```typescript
// ❌ NUNCA HACER: Conexiones WebSocket directas en componentes
// Esto causaba múltiples conexiones simultáneas

// ✅ CORRECTO: Una sola conexión vía WebSocketProvider
const { subscribe, isConnected } = useWebSocket();
```

### **🚨 Problemas de Vercel (MANEJADO)**
```typescript
// ✅ Configuración para Vercel (sin WebSocket nativo)
const config = {
  transports: ['polling', 'websocket'], // Fallback a polling
  reconnectionDelay: 3000,              // Paciencia con cold starts
  timeout: 30000                        // Timeout generoso
};
```

---

## 🔄 **Sistema de Reconexión Automática**

### **Control por Campo `autoReconnect`**
```typescript
// Habilitar reconexión automática
await prisma.webSocketConnection.update({
  where: { id: connectionId },
  data: { autoReconnect: true }
});

// Deshabilitar reconexión (para mantenimiento)
await prisma.webSocketConnection.update({
  where: { id: connectionId },
  data: { autoReconnect: false }
});
```

### **Comportamiento por Acción**
- **START**: `autoReconnect = true` (conexión persistente)
- **STOP**: `autoReconnect = false` (desconexión manual)
- **RESTART**: STOP + START (resultado final: `autoReconnect = true`)
- **TOGGLE-RECONNECT**: Alternar valor sin cambiar estado

---

## 🚀 **APIs de Control**

### **Endpoint Principal**
```
POST /api/websocket/{connectionId}/{action}
```

### **Acciones Disponibles**
- `start` - Iniciar conexión
- `stop` - Detener conexión
- `restart` - Reiniciar conexión
- `toggle-reconnect` - Alternar reconexión automática

### **Respuesta Estándar**
```json
{
  "success": true,
  "message": "Acción ejecutada correctamente",
  "data": {
    "connectionId": "string",
    "status": "connected|disconnected|error",
    "autoReconnect": boolean
  }
}
```

---

## 📈 **Monitoreo y Métricas**

### **Dashboard de WebSocket**
```
/configuracion/integraciones/websocket-manager
```

**Funcionalidades:**
- Vista en tiempo real de conexiones
- Control individual por conexión
- Logs con filtros avanzados
- Métricas de rendimiento
- Exportación de datos

### **Verificación de Estado**
```typescript
// Verificar conexión activa
const { isConnected } = useWebSocket();

// Verificar métricas del manager
const metrics = getWebSocketManager().getMetrics();
console.log('Conexiones activas:', metrics.activeConnections);
```

---

## 🎯 **Filosofía del Sistema**

### **❌ NO Usamos:**
- Timeouts artificiales (30s, 45s, etc.)
- Polling periódico
- Crons o timers
- Verificaciones por tiempo

### **✅ SÍ Usamos:**
- Eventos WebSocket inmediatos
- Heartbeat del sistema Shelly
- Confianza en datos en tiempo real
- Actualización solo con eventos reales

### **🔧 Principios Críticos:**
1. **WebSocket conectado** = confiar en tiempo real
2. **WebSocket desconectado** = problema real → marcar offline
3. **Reconexión** = solo reset visual, esperar mensajes reales
4. **BD siempre sincronizada** = actualizar solo en eventos reales
5. **Robustez ante errores** = sistema funciona aunque falten dispositivos

---

## 🔒 **Seguridad y Aislamiento**

### **Multi-Tenant**
- Cada conexión aislada por `systemId`
- Rooms separados en Socket.io
- Validación de permisos por usuario

### **Validación**
- Autenticación obligatoria con `session?.user?.systemId`
- Sanitización de mensajes WebSocket
- Rate limiting por conexión y IP

### **Auditoría**
- Logs completos con IP y User-Agent
- Registro de todas las acciones manuales
- Métricas de uso por sistema

---

## 🚀 **Inicialización Automática Implementada (Enero 2025)**

### **🎯 Problema Resuelto**
Los WebSockets ahora se inicializan automáticamente al autenticarse, no solo al entrar en páginas específicas.

### **✅ Solución Implementada**
**Archivo:** `contexts/websocket-context.tsx`

```typescript
// ✅ INICIALIZACIÓN AUTOMÁTICA DE WEBSOCKETS al autenticarse
useEffect(() => {
  const initializeWebSockets = async () => {
    if (!systemId) return;
    
    console.log('🚀 [WebSocketProvider] Inicializando WebSockets automáticamente...');
    
    try {
      // Inicializar Socket.io server
      const socketResponse = await fetch('/api/socket/init');
      const socketResult = await socketResponse.json();
      console.log('📡 [WebSocketProvider] Socket.io init:', socketResult);
      
      // Inicializar conexiones WebSocket con Shelly
      const shellyResponse = await fetch('/api/socket/start-monitoring');
      const shellyResult = await shellyResponse.json();
      console.log('🔌 [WebSocketProvider] Shelly WebSockets init:', shellyResult);
      
      console.log('✅ [WebSocketProvider] WebSockets inicializados automáticamente');
    } catch (error) {
      console.error('❌ [WebSocketProvider] Error inicializando WebSockets:', error);
    }
  };

  initializeWebSockets();
}, [systemId]);
```

### **🔧 Cambios Realizados**
1. **Inicialización automática** en `WebSocketProvider`
2. **Eliminación de inicialización manual** en `SmartPlugsPage`
3. **Logs mejorados** para debugging
4. **Activación inmediata** para:
   - Consumo en tiempo real para equipamiento
   - Menú flotante de enchufes
   - Tabla de enchufes inteligentes

### **📊 Resultado**
- **Antes**: WebSockets solo se iniciaban al entrar en tabla de enchufes
- **Después**: WebSockets se inician automáticamente al autenticarse
- **Beneficio**: Tiempo real disponible inmediatamente en toda la aplicación

---

## 🚀 **Mejores Prácticas**

### **Para Desarrolladores:**
1. **Usar contexto centralizado** - `useWebSocket()` o `useWebSocketOptional()`
2. **Verificar autoReconnect** antes de programar reconexiones
3. **Registrar eventos importantes** para auditoría
4. **Implementar cleanup** en useEffect
5. **Manejar errores** en callbacks de suscripción

### **Para Administradores:**
1. **Monitorear dashboard** regularmente
2. **Usar toggle-reconnect** para mantenimiento
3. **Configurar limpieza** automática de logs
4. **Revisar métricas** de rendimiento
5. **Establecer alertas** para errores críticos

---

## 📚 **Archivos Críticos del Sistema**

### **Core WebSocket**
- `pages/api/socket.js` - Servidor Socket.io central
- `hooks/useSocket.ts` - Hook base de conexión
- `contexts/websocket-context.tsx` - Contexto centralizado

### **Shelly Integration**
- `lib/shelly/websocket-manager.ts` - Manager principal
- `lib/shelly/device-offline-manager.ts` - Control de estados
- `lib/shelly/robust-websocket-manager.ts` - Conexiones robustas

### **APIs de Control**
- `app/api/websocket/[connectionId]/[action]/route.ts` - Control de conexiones
- `app/api/internal/shelly/active-credentials/route.ts` - Verificación de credenciales

### **Monitoreo**
- `components/websocket/websocket-logs.tsx` - Logs en tiempo real
- `app/(main)/configuracion/integraciones/websocket-manager/page.tsx` - Dashboard

---

**Documentación actualizada**: Enero 2025  
**Versión del sistema**: 3.0.0  
**Estado**: Completamente funcional y estable  
**Arquitectura**: Centralizada con tiempo real puro 