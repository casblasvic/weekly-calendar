# 🔌 WebSocket Manager - Arquitectura Completa

## 📋 **Resumen del Sistema**

El WebSocket Manager es el núcleo de gestión de conexiones WebSocket en tiempo real para el SaaS de clínicas. Maneja múltiples tipos de conexiones, incluyendo Shelly Cloud, Socket.IO y conexiones personalizadas.

## 🗄️ **Estructura de Base de Datos**

### Tabla `WebSocketConnection`
```sql
model WebSocketConnection {
  id            String   @id @default(cuid())
  type          String   // "SHELLY", "SOCKET_IO", "CUSTOM", "TEST"
  referenceId   String   // credentialId para Shelly, systemId para Socket.io
  status        String   // "connected", "disconnected", "error", "reconnecting"
  lastPingAt    DateTime?
  errorMessage  String?
  metadata      Json?
  autoReconnect Boolean  @default(true) // 🔑 CONTROL DE RECONEXIÓN AUTOMÁTICA
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  logs          WebSocketLog[]
  
  @@unique([type, referenceId])
}
```

### Tabla `WebSocketLog`
```sql
model WebSocketLog {
  id               String              @id @default(cuid())
  connectionId     String
  eventType        String              // "connect", "disconnect", "error", "message", "ping", "action", "reconnect_skipped"
  message          String?             @db.Text
  errorDetails     String?             @db.Text
  metadata         Json?
  responseTime     Int?
  dataSize         Int?
  clientIp         String?
  userAgent        String?
  createdAt        DateTime            @default(now())
}
```

## 🔄 **Sistema de Reconexión Automática**

### 🔑 **Campo `autoReconnect`**

El campo `autoReconnect` controla si una conexión debe reconectarse automáticamente cuando se desconecta:

- **`true` (default)**: La conexión se reconecta automáticamente tras desconexiones
- **`false`**: La conexión permanece desconectada hasta intervención manual

### 📋 **Comportamiento por Acción**

#### ▶️ **Acción START (Iniciar)**
```typescript
// Al iniciar manualmente una conexión:
autoReconnect = true  // Se reactiva la reconexión automática
status = 'connected'
```

**Propósito**: Si un usuario inicia manualmente una conexión, asumimos que quiere que funcione de forma continua.

#### ⏹️ **Acción STOP (Detener)**
```typescript
// Al detener manualmente una conexión:
autoReconnect = false // Se desactiva la reconexión automática
status = 'disconnected'
```

**Propósito**: Si un usuario detiene manualmente una conexión, NO queremos que se reconecte automáticamente.

#### 🔄 **Acción RESTART (Reiniciar)**
```typescript
// Al reiniciar una conexión:
// 1. STOP: autoReconnect = false, status = 'disconnected'
// 2. Esperar 1 segundo
// 3. START: autoReconnect = true, status = 'connected'
```

#### ⚙️ **Acción TOGGLE-RECONNECT**
```typescript
// Cambiar solo el modo de reconexión:
autoReconnect = !autoReconnect // Alternar valor actual
// El status NO cambia
```

### 🔌 **Implementación en WebSocket Manager**

#### **Shelly WebSocket Manager**
```typescript
private async handleClose(credentialId: string): Promise<void> {
    // 1. Actualizar estado a 'disconnected'
    await this.updateConnectionStatus(credentialId, 'disconnected');
    
    // 2. Verificar campo autoReconnect en BD
    const webSocketConnection = await prisma.webSocketConnection.findFirst({
        where: { type: 'SHELLY', referenceId: credentialId }
    });
    
    // 3. Solo reconectar si autoReconnect está habilitado
    if (webSocketConnection?.autoReconnect === true) {
        console.log(`🔄 AutoReconnect habilitado, reconectando en 5s...`);
        setTimeout(() => this.connectCredential(credentialId), 5000);
    } else {
        console.log(`⏸️ AutoReconnect deshabilitado, NO se reconectará`);
        await this.logWebSocketEvent(credentialId, 'reconnect_skipped', 
            'Reconexión automática omitida - autoReconnect deshabilitado');
    }
}
```

## 🎯 **Tipos de Conexión Soportados**

### 1. **SHELLY** 
- **Propósito**: Conexiones a Shelly Cloud API
- **ReferenceId**: `credentialId` de tabla `ShellyCredential`
- **Comportamiento**: WebSocket persistente con auto-mapeo de dispositivos
- **Reconexión**: Respeta `autoReconnect`, reconecta cada 5 segundos

### 2. **SOCKET_IO**
- **Propósito**: Conexiones Socket.IO para actualizaciones en tiempo real
- **ReferenceId**: `systemId` 
- **Comportamiento**: Inicialización automática del servidor Socket.IO
- **Reconexión**: Respeta `autoReconnect`

### 3. **CUSTOM**
- **Propósito**: Conexiones personalizadas definidas por el usuario
- **ReferenceId**: Definido por implementación específica
- **Comportamiento**: Placeholder para lógica personalizada
- **Reconexión**: Respeta `autoReconnect`

### 4. **TEST**
- **Propósito**: Conexiones de prueba para testing y desarrollo
- **ReferenceId**: ID de prueba
- **Comportamiento**: Simulación de conexión (no realiza operaciones reales)
- **Reconexión**: Respeta `autoReconnect`

## 🛠️ **API de Control**

### **Endpoint**: `POST /api/websocket/{connectionId}/{action}`

#### **Acciones Disponibles:**

##### ▶️ `start`
- Inicia la conexión WebSocket
- Establece `autoReconnect = true`
- Cambia `status = 'connected'`

##### ⏹️ `stop`
- Detiene la conexión WebSocket
- Establece `autoReconnect = false`
- Cambia `status = 'disconnected'`
- **Cierra el WebSocket real** (para tipo SHELLY)

##### 🔄 `restart`
- Ejecuta `stop` seguido de `start`
- Resultado final: `autoReconnect = true`

##### ⚙️ `toggle-reconnect`
- Alterna el valor de `autoReconnect`
- NO cambia el `status` de la conexión

### **Respuestas de la API:**
```typescript
{
  success: true,
  message: "Acción ejecutada correctamente",
  data: {
    connectionId: string,
    status: "connected" | "disconnected" | "error",
    autoReconnect: boolean,
    message: string
  }
}
```

## 📊 **Dashboard y Monitoreo**

### **Página**: `/configuracion/integraciones/websocket-manager`

#### **Funcionalidades:**
- ✅ Vista en tiempo real de todas las conexiones
- ✅ Control individual por conexión (start/stop/restart)
- ✅ Indicador visual del estado `autoReconnect`
- ✅ Logs en tiempo real con filtros
- ✅ Métricas de mensajes enviados/recibidos
- ✅ Exportación de logs a CSV

#### **Estados Visuales:**
- 🟢 **Conectado**: Badge verde "Conectado"
- 🔴 **Desconectado**: Badge rojo "Desconectado"  
- 🟡 **Conectando**: Badge amarillo "Conectando" (con spinner)
- ❌ **Error**: Badge rojo "Error"

#### **Indicador AutoReconnect:**
- 🔄 **Habilitado**: Icono de refresh visible
- ⏸️ **Deshabilitado**: Icono de pausa visible

## 🔍 **Logs y Auditoría**

### **Tipos de Eventos Registrados:**
- `connect`: Conexión establecida exitosamente
- `disconnect`: Conexión cerrada
- `error`: Error en la conexión
- `message`: Mensaje enviado/recibido
- `action`: Acción manual ejecutada por usuario
- `action_success`: Acción completada exitosamente
- `action_error`: Error ejecutando acción
- `reconnect_skipped`: Reconexión omitida por autoReconnect=false
- `config_change`: Cambio en configuración (ej: toggle autoReconnect)

### **Metadata Incluida:**
- **Acciones manuales**: userId, userEmail, clientIP, userAgent
- **Errores**: stack trace, error message
- **Métricas**: responseTime, dataSize
- **Configuración**: valores anteriores y nuevos

## ⚡ **Optimizaciones de Rendimiento**

### **Frontend:**
- ✅ **Actualización optimista**: UI se actualiza inmediatamente
- ✅ **Componentes memoizados**: Evita re-renders innecesarios
- ✅ **Debounced updates**: Limita frecuencia de actualizaciones
- ✅ **Lazy loading**: Logs se cargan bajo demanda

### **Backend:**
- ✅ **Rate limiting**: Máximo 60 mensajes/minuto por conexión
- ✅ **Message queuing**: Cola de mensajes para conexiones desconectadas
- ✅ **Connection pooling**: Reutilización de conexiones WebSocket
- ✅ **Auto-cleanup**: Limpieza automática de logs antiguos

## 🔒 **Seguridad**

### **Autenticación:**
- ✅ Validación de `systemId` del usuario
- ✅ Verificación de permisos por conexión
- ✅ Logs de auditoría con IP y User-Agent

### **Validación:**
- ✅ Sanitización de mensajes WebSocket
- ✅ Límite de tamaño de mensajes (10KB)
- ✅ Validación estricta de parámetros de API

### **Prevención de Ataques:**
- ✅ Rate limiting por IP
- ✅ Validación de certificados SSL
- ✅ Timeout de handshake (10s)

## 🚀 **Casos de Uso Comunes**

### **1. Parar Temporalmente un Dispositivo**
```bash
# Detener (autoReconnect = false)
POST /api/websocket/{connectionId}/stop

# El dispositivo NO se reconectará automáticamente
# Permanece desconectado hasta acción manual
```

### **2. Reiniciar Conexión con Problemas**
```bash
# Reiniciar (autoReconnect = true al final)
POST /api/websocket/{connectionId}/restart

# La conexión se reinicia y queda habilitada para auto-reconexión
```

### **3. Deshabilitar Reconexión para Mantenimiento**
```bash
# Solo cambiar autoReconnect sin afectar la conexión actual
POST /api/websocket/{connectionId}/toggle-reconnect

# La conexión sigue activa pero NO se reconectará si se cae
```

### **4. Reactivar Dispositivo Pausado**
```bash
# Iniciar (autoReconnect = true)
POST /api/websocket/{connectionId}/start

# El dispositivo se conecta y queda habilitado para auto-reconexión
```

## 🔧 **Configuración Avanzada**

### **Variables de Entorno:**
```env
# WebSocket Shelly
SHELLY_WEBSOCKET_TIMEOUT=10000
SHELLY_RECONNECT_DELAY=5000
SHELLY_MAX_MESSAGE_SIZE=10240

# Rate Limiting
WEBSOCKET_MAX_MESSAGES_PER_MINUTE=60
WEBSOCKET_RATE_LIMIT_WINDOW=60000

# Logs
WEBSOCKET_LOG_RETENTION_DAYS=30
WEBSOCKET_AUTO_CLEANUP_ENABLED=true
```

### **Configuración por Tipo:**
```typescript
const CONNECTION_CONFIG = {
  SHELLY: {
    reconnectDelay: 5000,
    maxRetries: 10,
    heartbeatInterval: 30000
  },
  SOCKET_IO: {
    reconnectDelay: 1000,
    maxRetries: 5,
    heartbeatInterval: 25000
  },
  CUSTOM: {
    reconnectDelay: 3000,
    maxRetries: 3,
    heartbeatInterval: 60000
  },
  TEST: {
    reconnectDelay: 1000,
    maxRetries: 1,
    heartbeatInterval: 10000
  }
};
```

## 🎯 **Mejores Prácticas**

### **Para Desarrolladores:**
1. **Siempre verificar `autoReconnect`** antes de programar reconexiones
2. **Registrar eventos importantes** en `WebSocketLog` para auditoría
3. **Usar actualización optimista** en UI para mejor UX
4. **Implementar timeouts** para evitar conexiones colgadas
5. **Validar mensajes** antes de procesarlos

### **Para Administradores:**
1. **Monitorear logs regularmente** para detectar problemas
2. **Usar `toggle-reconnect`** para mantenimiento sin desconectar
3. **Configurar limpieza automática** de logs para evitar crecimiento excesivo
4. **Revisar métricas** de rendimiento periódicamente
5. **Establecer alertas** para conexiones en estado de error

## 🔮 **Roadmap Futuro**

### **Próximas Funcionalidades:**
- [ ] **Clustering**: Soporte para múltiples instancias del servidor
- [ ] **Load Balancing**: Distribución de conexiones entre servidores
- [ ] **Health Checks**: Verificación automática de salud de conexiones
- [ ] **Metrics Dashboard**: Dashboard avanzado con gráficos de métricas
- [ ] **Alert System**: Sistema de alertas para conexiones críticas
- [ ] **Backup Connections**: Conexiones de respaldo automáticas
- [ ] **Custom Protocols**: Soporte para protocolos WebSocket personalizados

---

**Documentación actualizada**: Diciembre 2024
**Versión del sistema**: 2.0.0  
**Autor**: WebSocket Manager Team 