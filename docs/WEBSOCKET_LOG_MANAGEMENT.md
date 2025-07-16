# 🔧 WEBSOCKET LOG MANAGEMENT

## Descripción General

Sistema completo para gestionar los logs de WebSocket y dispositivos Shelly desde la interfaz de usuario. Permite activar/desactivar diferentes tipos de logs en tiempo real sin necesidad de reiniciar el servidor.

## Arquitectura del Sistema

### 1. Componentes Principales

```
lib/websocket/log-manager.ts         # Servicio de gestión de logs
app/api/internal/websocket-logs/     # API para configuración
lib/hooks/use-websocket-logs.ts      # Hook para frontend
app/.../websocket-manager/page.tsx   # Interfaz de usuario
```

### 2. Tipos de Logs Gestionados

| Tipo | Descripción | Frecuencia | Impacto |
|------|-------------|------------|---------|
| `liveSample` | Muestras de datos en tiempo real | Cada segundo | Alto |
| `webSocketRaw` | Mensajes WebSocket raw | Por evento | Medio |
| `deviceStatusUpdate` | Actualizaciones de dispositivos | Por cambio | Medio |
| `deviceUpdate` | Callbacks de dispositivos | Por cambio | Medio |
| `socketJs` | Procesamiento Socket.js | Por evento | Bajo |
| `apiCalls` | Llamadas a APIs WebSocket | Por llamada | Bajo |

## Configuración y Uso

### 1. Configuración desde UI

**Acceso:**
```
Configuración > Integraciones > WebSocket Manager
```

**Funcionalidades:**
- ✅ Switch maestro para activar/desactivar todos los logs
- ✅ Switches individuales para cada tipo de log
- ✅ Botón para resetear configuración
- ✅ Estadísticas de logs activos/inactivos
- ✅ Información detallada de cada tipo de log

### 2. Configuración Programática

```typescript
import { webSocketLogManager, conditionalLog } from '@/lib/websocket/log-manager'

// Verificar si un tipo de log está activo
if (webSocketLogManager.isLogTypeEnabled('liveSample')) {
  console.log('Live sample logging activo')
}

// Usar logs condicionales
conditionalLog.liveSample('Datos recibidos:', data)
conditionalLog.webSocketRaw('Mensaje WebSocket:', message)
conditionalLog.deviceStatusUpdate('Estado actualizado:', deviceId)
```

### 3. API Endpoints

```typescript
// Obtener configuración
GET /api/internal/websocket-logs

// Actualizar configuración completa
POST /api/internal/websocket-logs
{
  "enabled": true,
  "config": {
    "liveSample": false,
    "webSocketRaw": true,
    "deviceStatusUpdate": true,
    "deviceUpdate": false,
    "socketJs": false,
    "apiCalls": true
  }
}

// Actualizar tipo específico
PUT /api/internal/websocket-logs
{
  "logType": "liveSample",
  "enabled": true
}

// Resetear configuración
DELETE /api/internal/websocket-logs
```

## Integración con Código Existente

### 1. Reemplazar Logs Existentes

**Antes:**
```typescript
console.log('[LIVE-SAMPLE] ---- Nueva llamada recibida ----')
console.log('🔍 [WebSocket RAW] Mensaje recibido:', message)
console.log('🎯 [handleDeviceStatusUpdate] LLAMADO para deviceId=', deviceId)
```

**Después:**
```typescript
import { conditionalLog } from '@/lib/websocket/log-manager'

conditionalLog.liveSample('---- Nueva llamada recibida ----')
conditionalLog.webSocketRaw('Mensaje recibido:', message)
conditionalLog.deviceStatusUpdate('LLAMADO para deviceId=', deviceId)
```

### 2. Implementar en Nuevos Archivos

```typescript
/**
 * 🔧 WEBSOCKET LOG MANAGEMENT
 * Este archivo usa el sistema de logs condicionales
 * @see docs/WEBSOCKET_LOG_MANAGEMENT.md
 */

import { conditionalLog } from '@/lib/websocket/log-manager'

export function handleWebSocketMessage(message: any) {
  conditionalLog.webSocketRaw('Mensaje recibido:', message)
  
  // Procesar mensaje...
  
  conditionalLog.socketJs('Mensaje procesado exitosamente')
}
```

## Persistencia y Sincronización

### 1. LocalStorage

- La configuración se guarda automáticamente en `localStorage`
- Clave: `websocket-log-config`
- Persistencia entre sesiones del navegador

### 2. Memoria del Servidor

- Configuración temporal en memoria del servidor
- Se reinicia al reiniciar el servidor
- **TODO:** Implementar persistencia en Redis/Database

### 3. Sincronización

- Cambios desde UI se sincronizan inmediatamente
- Los logs se activan/desactivan en tiempo real
- No requiere reiniciar el servidor

## Monitoreo y Debugging

### 1. Estadísticas de Logs

```typescript
const stats = webSocketLogManager.getStats()
console.log('Total tipos de log:', stats.totalLogTypes)
console.log('Logs activos:', stats.enabledLogTypes)
console.log('Logs inactivos:', stats.disabledLogTypes)
console.log('Última actualización:', stats.lastUpdated)
```

### 2. Debugging en Tiempo Real

1. **Activar logs específicos** desde la UI
2. **Reproducir el problema** en la aplicación
3. **Revisar logs** en la consola del navegador
4. **Desactivar logs** una vez resuelto el problema

### 3. Mejores Prácticas

- ✅ Mantener logs desactivados en producción
- ✅ Activar solo los tipos necesarios para debugging
- ✅ Usar logs Live Sample solo para casos específicos
- ✅ Documentar el propósito de cada tipo de log

## Casos de Uso Comunes

### 1. Debugging de Dispositivos Shelly

```typescript
// Activar logs relevantes
webSocketLogManager.toggleLogType('deviceStatusUpdate', true)
webSocketLogManager.toggleLogType('deviceUpdate', true)
webSocketLogManager.toggleLogType('webSocketRaw', true)

// Reproducir problema con dispositivo
// Revisar logs en consola
// Desactivar logs cuando termine
```

### 2. Monitoreo de Performance

```typescript
// Activar logs de API calls
webSocketLogManager.toggleLogType('apiCalls', true)

// Monitorear llamadas a APIs
// Identificar cuellos de botella
// Optimizar según sea necesario
```

### 3. Análisis de Flujo de Datos

```typescript
// Activar logs de Socket.js
webSocketLogManager.toggleLogType('socketJs', true)

// Seguir flujo de datos
// Identificar problemas de procesamiento
// Optimizar lógica de negocio
```

## Extensibilidad

### 1. Agregar Nuevos Tipos de Log

```typescript
// En log-manager.ts
export interface WebSocketLogConfig {
  // ... logs existentes
  newLogType: boolean
}

// En conditionalLog
export const conditionalLog = {
  // ... logs existentes
  newLogType: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('newLogType')) {
      console.log(`🆕 [NEW-LOG] ${message}`, ...args)
    }
  }
}
```

### 2. Integrar con Sistemas Externos

```typescript
// Ejemplo: Enviar logs a servicio externo
export const conditionalLog = {
  apiCalls: (message: string, ...args: any[]) => {
    if (webSocketLogManager.isLogTypeEnabled('apiCalls')) {
      console.log(`📡 [API] ${message}`, ...args)
      
      // Enviar a servicio de monitoreo
      if (PRODUCTION) {
        sendToMonitoringService('api-call', message, args)
      }
    }
  }
}
```

## Seguridad y Performance

### 1. Consideraciones de Seguridad

- ✅ Logs no exponen información sensible
- ✅ Configuración requiere autenticación
- ✅ Logs se mantienen en cliente, no en servidor
- ⚠️ Revisar logs antes de producción

### 2. Impacto en Performance

- ✅ Logs desactivados tienen impacto mínimo
- ✅ Evaluación condicional muy eficiente
- ⚠️ Logs Live Sample pueden afectar performance
- ⚠️ Logs excesivos pueden llenar consola

## Roadmap Futuro

### 1. Versión 2.0 (Q2 2024)

- [ ] Persistencia en Redis/Database
- [ ] Logs con niveles (DEBUG, INFO, WARN, ERROR)
- [ ] Filtros avanzados por contexto
- [ ] Exportación de logs a archivos

### 2. Versión 3.0 (Q3 2024)

- [ ] Dashboard de logs en tiempo real
- [ ] Alertas automáticas por patrones
- [ ] Integración con sistemas de monitoreo
- [ ] Análisis de logs con IA

---

## 🚀 Implementación Completada

✅ **Servicio de Log Manager** - Gestión centralizada de configuración  
✅ **API de Configuración** - Endpoints para CRUD de configuración  
✅ **Hook de React** - Integración con React Query  
✅ **Interfaz de Usuario** - Página completa con switches  
✅ **Documentación** - Guía completa de uso  
✅ **Integración con Menús** - Acceso desde configuración  

**Fecha de implementación:** 2024-07-16  
**Versión:** 1.0.0  
**Estado:** Completado y funcional  

---

*Para más información técnica, consultar los archivos de código fuente mencionados en este documento.*