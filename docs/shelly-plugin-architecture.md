# 🔌 Plugin Shelly - Arquitectura Completa y Sistema de Reconexión

## 📋 **Resumen del Plugin**

El Plugin Shelly es una integración completa con Shelly Cloud API que permite controlar dispositivos IoT (enchufes inteligentes) a través de conexiones WebSocket persistentes. Incluye un sistema robusto de reconexión automática controlable.

## 🔄 **Sistema de Reconexión Automática**

### 🔑 **Campo `autoReconnect` - Control Total**

El Plugin Shelly respeta completamente el campo `autoReconnect` de la tabla `WebSocketConnection`:

```typescript
// Cuando autoReconnect = true (DEFAULT)
- La conexión se reconecta automáticamente cada 5 segundos tras desconexión
- Los logs muestran: "🔄 AutoReconnect habilitado, reconectando en 5s..."
- Se programa timer de reconexión automática

// Cuando autoReconnect = false
- NO se programa reconexión automática
- Los logs muestran: "⏸️ AutoReconnect deshabilitado, NO se reconectará"
- Se registra evento 'reconnect_skipped' en logs
- La conexión permanece desconectada hasta acción manual
```

### 📋 **Comportamiento Detallado por Acción**

#### ▶️ **START (Iniciar WebSocket)**
```typescript
POST /api/websocket/{connectionId}/start

// 1. Conecta WebSocket a Shelly Cloud
await shellyWebSocketManager.connectCredential(credentialId);

// 2. Actualiza BD con autoReconnect = true
await prisma.webSocketConnection.update({
  data: {
    status: 'connected',
    autoReconnect: true,  // ← REACTIVADO
    lastPingAt: new Date()
  }
});

// 3. Log de auditoría
"Conexión Shelly iniciada exitosamente - autoReconnect reactivado"
```

#### ⏹️ **STOP (Detener WebSocket)**
```typescript
POST /api/websocket/{connectionId}/stop

// 1. Actualiza BD con autoReconnect = false
await prisma.webSocketConnection.update({
  data: {
    status: 'disconnected',
    autoReconnect: false,  // ← DESACTIVADO
    lastPingAt: null
  }
});

// 2. Cierra WebSocket real
await shellyWebSocketManager.disconnectCredential(credentialId);

// 3. Log de auditoría
"Conexión detenida manualmente - autoReconnect desactivado"
```

#### 🔄 **RESTART (Reiniciar WebSocket)**
```typescript
POST /api/websocket/{connectionId}/restart

// 1. STOP: autoReconnect = false, WebSocket cerrado
// 2. Esperar 1 segundo
// 3. START: autoReconnect = true, WebSocket conectado

// Resultado final: autoReconnect = true
```

#### ⚙️ **TOGGLE-RECONNECT (Solo cambiar autoReconnect)**
```typescript
POST /api/websocket/{connectionId}/toggle-reconnect

// Solo alterna el campo autoReconnect
autoReconnect = !autoReconnect

// NO afecta el estado de la conexión actual
// NO cierra/abre WebSockets
```

### 🔌 **Implementación en Shelly WebSocket Manager**

#### **Función `handleClose` - Corazón del Sistema**
```typescript
private async handleClose(credentialId: string): Promise<void> {
    console.log(`WebSocket cerrado para credential ${credentialId}`);
    
    // 1. Actualizar estado a 'disconnected'
    await this.updateConnectionStatus(credentialId, 'disconnected');
    
    // 2. Limpiar conexión de memoria
    this.connections.delete(credentialId);
    
    // 🔒 3. VERIFICAR autoReconnect EN BD (CRÍTICO)
    const webSocketConnection = await prisma.webSocketConnection.findFirst({
        where: {
            type: 'SHELLY',
            referenceId: credentialId
        }
    });
    
    // 4. Solo reconectar si autoReconnect está habilitado
    if (webSocketConnection?.autoReconnect === true) {
        console.log(`🔄 AutoReconnect habilitado para ${credentialId}, programando reconexión en 5 segundos...`);
        
        const timer = setTimeout(() => {
            console.log(`🔄 Intentando reconectar credential ${credentialId}...`);
            this.connectCredential(credentialId);
        }, 5000);
        
        this.reconnectTimers.set(credentialId, timer);
    } else {
        console.log(`⏸️ AutoReconnect deshabilitado para ${credentialId}, NO se reconectará automáticamente`);
        
        // Log para auditoría
        await this.logWebSocketEvent(
            credentialId,
            'reconnect_skipped',
            'Reconexión automática omitida - autoReconnect deshabilitado'
        );
    }
}
```

#### **Función `logWebSocketEvent` - Auditoría Completa**
```typescript
private async logWebSocketEvent(
    credentialId: string,
    eventType: string,
    message: string,
    metadata?: any
): Promise<void> {
    try {
        // Buscar la conexión WebSocket para obtener su ID
        const webSocketConnection = await prisma.webSocketConnection.findFirst({
            where: {
                type: 'SHELLY',
                referenceId: credentialId
            }
        });

        if (webSocketConnection) {
            await prisma.webSocketLog.create({
                data: {
                    connectionId: webSocketConnection.id,
                    eventType,
                    message,
                    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
                    createdAt: new Date()
                }
            });
        }
    } catch (error) {
        console.error('Error logging WebSocket event:', error);
    }
}
```

## 🎯 **Casos de Uso Reales**

### **Caso 1: Mantenimiento Programado**
```bash
# Escenario: Mantenimiento de Shelly Cloud programado para 2 AM

# 1. Deshabilitar reconexión antes del mantenimiento
POST /api/websocket/{connectionId}/toggle-reconnect
# autoReconnect = false, conexión sigue activa

# 2. Durante mantenimiento: Shelly Cloud cierra conexiones
# - WebSocket se desconecta automáticamente
# - handleClose() detecta autoReconnect = false
# - NO se programa reconexión
# - Log: "reconnect_skipped - autoReconnect deshabilitado"

# 3. Después del mantenimiento: Reactivar manualmente
POST /api/websocket/{connectionId}/start
# autoReconnect = true, conexión restablecida
```

### **Caso 2: Dispositivo Problemático**
```bash
# Escenario: Un dispositivo Shelly está causando problemas

# 1. Detener completamente
POST /api/websocket/{connectionId}/stop
# - WebSocket cerrado inmediatamente
# - autoReconnect = false
# - Dispositivo queda aislado hasta intervención manual

# 2. El dispositivo NO se reconectará solo
# - Permanece en estado 'disconnected'
# - No consume recursos del servidor
# - No genera logs de reconexión

# 3. Cuando se solucione el problema
POST /api/websocket/{connectionId}/start
# - Conexión restablecida
# - autoReconnect = true
# - Vuelve a funcionar normalmente
```

### **Caso 3: Debugging de Conexión**
```bash
# Escenario: Investigar problemas de conectividad

# 1. Deshabilitar reconexión para análisis
POST /api/websocket/{connectionId}/toggle-reconnect
# autoReconnect = false, pero conexión sigue activa

# 2. Observar comportamiento sin reconexiones automáticas
# - Si la conexión se cae, NO se reconecta
# - Permite analizar logs sin interferencias
# - Se puede ver exactamente cuándo y por qué se desconecta

# 3. Reactivar cuando termine el análisis
POST /api/websocket/{connectionId}/toggle-reconnect
# autoReconnect = true, reconexión automática restaurada
```

## 📊 **Logs de Auditoría Detallados**

### **Tipos de Eventos Específicos del Plugin:**
```typescript
// Eventos de conexión
'connect': 'Conexión Shelly iniciada exitosamente - autoReconnect reactivado'
'disconnect': 'Conexión detenida manualmente - autoReconnect desactivado'

// Eventos de reconexión
'reconnect_skipped': 'Reconexión automática omitida - autoReconnect deshabilitado'
'reconnect_attempt': 'Intentando reconectar credential {credentialId}'

// Eventos de control
'action': 'Acción start/stop/restart/toggle-reconnect iniciada por usuario'
'action_success': 'Acción ejecutada exitosamente'
'action_error': 'Error ejecutando acción'

// Eventos de configuración
'config_change': 'AutoReconnect habilitado/deshabilitado'
```

### **Metadata Incluida en Logs:**
```json
{
  "userId": "user_123",
  "userEmail": "admin@clinica.com", 
  "clientIp": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "credentialId": "cred_456",
  "previousAutoReconnect": false,
  "newAutoReconnect": true,
  "connectionType": "SHELLY"
}
```

## 🔧 **Configuración del Sistema**

### **Variables de Entorno Específicas:**
```env
# Reconexión Shelly
SHELLY_RECONNECT_DELAY=5000          # 5 segundos entre intentos
SHELLY_MAX_RECONNECT_ATTEMPTS=10     # Máximo 10 intentos consecutivos
SHELLY_RECONNECT_BACKOFF=1.5         # Factor de backoff exponencial

# WebSocket Shelly
SHELLY_WEBSOCKET_TIMEOUT=10000       # Timeout de handshake
SHELLY_MAX_MESSAGE_SIZE=10240        # Tamaño máximo de mensaje
SHELLY_HEARTBEAT_INTERVAL=30000      # Intervalo de heartbeat

# Logs y Auditoría
SHELLY_LOG_RECONNECT_EVENTS=true     # Registrar eventos de reconexión
SHELLY_LOG_LEVEL=debug               # Nivel de logging
```

### **Configuración por Credencial:**
```typescript
interface ShellyConnectionConfig {
  credentialId: string;
  autoReconnect: boolean;           // Desde BD
  reconnectDelay: number;           // 5000ms default
  maxRetries: number;               // 10 default
  lastReconnectAttempt?: Date;
  consecutiveFailures: number;
}
```

## 🛡️ **Seguridad y Control**

### **Prevención de Reconexiones Maliciosas:**
```typescript
// Rate limiting de reconexiones
const MAX_RECONNECT_ATTEMPTS_PER_HOUR = 60;
const RECONNECT_COOLDOWN_MINUTES = 5;

// Backoff exponencial para fallos consecutivos
const calculateReconnectDelay = (attempts: number): number => {
  const baseDelay = 5000; // 5 segundos
  const maxDelay = 300000; // 5 minutos máximo
  const delay = baseDelay * Math.pow(1.5, attempts);
  return Math.min(delay, maxDelay);
};
```

### **Logs de Seguridad:**
```typescript
// Detectar patrones sospechosos
if (consecutiveFailures > 5) {
  await this.logWebSocketEvent(credentialId, 'security_alert', 
    `Múltiples fallos de reconexión consecutivos: ${consecutiveFailures}`);
}

// Auditoría de cambios de autoReconnect
await this.logWebSocketEvent(credentialId, 'security_config_change',
  `AutoReconnect cambiado por usuario ${userId} desde IP ${clientIp}`);
```

## 🎯 **Mejores Prácticas de Implementación**

### **Para Desarrolladores:**
1. **Siempre verificar `autoReconnect`** antes de programar timers
2. **Usar logs estructurados** con metadata completa
3. **Implementar backoff exponencial** para evitar spam de reconexiones
4. **Validar credenciales** antes de cada intento de reconexión
5. **Limpiar timers** correctamente para evitar memory leaks

### **Para Administradores:**
1. **Monitorear eventos `reconnect_skipped`** para detectar dispositivos pausados
2. **Establecer alertas** para fallos de reconexión consecutivos
3. **Usar `toggle-reconnect`** para mantenimiento sin desconectar
4. **Revisar logs de seguridad** para detectar patrones anómalos
5. **Configurar limpieza automática** de logs antiguos

## 🔮 **Evolución del Sistema**

### **Próximas Mejoras:**
- [ ] **Reconexión inteligente** basada en patrones de uso
- [ ] **Alertas proactivas** para dispositivos problemáticos  
- [ ] **Dashboard de salud** por credencial Shelly
- [ ] **Backup automático** de configuraciones críticas
- [ ] **Load balancing** entre múltiples instancias Shelly Cloud

### **Métricas Avanzadas:**
- [ ] **Tiempo promedio** entre desconexión y reconexión
- [ ] **Tasa de éxito** de reconexiones por credencial
- [ ] **Impacto de autoReconnect** en estabilidad del sistema
- [ ] **Correlación** entre horarios y fallos de conexión

---

**Plugin Shelly - Sistema de Reconexión Automática**
**Versión**: 2.0.0 | **Actualizado**: Diciembre 2024
**Documentación completa para marketplace y desarrollo interno** 