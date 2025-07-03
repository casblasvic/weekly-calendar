# Control de Logs de WebSocket

## Problema Solucionado

Los logs de WebSocket eran extremadamente verbosos y saturaban la consola tanto en el **servidor** como en el **cliente** (navegador), haciendo muy difícil el debugging. Este sistema permite controlar qué logs se muestran usando variables de entorno (servidor) y localStorage (cliente).

## Configuración

### Variables de Entorno (Servidor)

Agrega estas variables a tu archivo `.env.local`:

```bash
# Habilita logs de debug muy detallados (🔍)
WEBSOCKET_DEBUG=true

# Habilita logs de información verbosa (📡, 💾, 📤, 📝)
WEBSOCKET_VERBOSE=true
```

### localStorage (Cliente/Navegador)

Para controlar los logs del frontend, abre la **consola del navegador** y ejecuta:

```javascript
// Habilitar logs verbosos del cliente
enableWebSocketLogs()

// Habilitar logs de debug (incluye verbose)
enableWebSocketDebug()

// Deshabilitar todos los logs del cliente
disableWebSocketLogs()

// O manualmente:
localStorage.setItem('WEBSOCKET_VERBOSE', 'true')
localStorage.setItem('WEBSOCKET_DEBUG', 'true')
```

**Nota**: Después de ejecutar estos comandos, **recarga la página** para aplicar los cambios.

### Niveles de Logging

#### 1. **Siempre Visibles** (No se pueden desactivar)
- ✅ Logs de éxito importantes
- ❌ Logs de error
- ⚠️ Logs de advertencia

#### 2. **Verbose** (`WEBSOCKET_VERBOSE=true`)
- 📡 StatusOnChange de dispositivos
- 💾 Actualizaciones de base de datos
- 📤 Envío de updates por WebSocket
- 📝 Creación de logs y respuestas de comandos
- 🔄 Mapeo automático de dispositivos

#### 3. **Debug** (`WEBSOCKET_DEBUG=true`)
- 🔍 Mensajes WebSocket crudos
- 🔍 Eventos no reconocidos
- 🔍 Datos de switch detallados

## Uso Recomendado

### Desarrollo Normal
```bash
# Sin variables de entorno - Solo logs importantes
```

### Debugging de Dispositivos
```bash
WEBSOCKET_VERBOSE=true
```

### Debugging Profundo
```bash
WEBSOCKET_DEBUG=true
WEBSOCKET_VERBOSE=true
```

## Archivos Modificados

### Servidor
- `lib/utils/websocket-logger.ts` - Utilidad de logging TypeScript
- `lib/utils/websocket-logger.js` - Utilidad de logging JavaScript
- `lib/shelly/websocket-manager.ts` - WebSocket manager actualizado
- `pages/api/socket.js` - Socket.io handler actualizado

### Cliente
- `lib/utils/client-logger.ts` - Utilidad de logging para el frontend
- `hooks/useSocket.ts` - Hook de Socket.io actualizado
- `hooks/use-smart-plugs-floating-menu.ts` - Hook del menú flotante actualizado
- `components/LayoutWrapper.tsx` - Componente de layout actualizado

## Ejemplo de Logs

### Sin configuración (Solo importantes)

**Servidor**:
```
✅ WebSocket Shelly conectado para credencial abc123
⚠️ No se encontró dispositivo xyz789 para credencial abc123
❌ Error conectando credential abc123: Token expirado
```

**Cliente** (navegador): Sin logs verbosos

### Con logs verbosos habilitados

**Servidor** (`WEBSOCKET_VERBOSE=true`):
```
✅ WebSocket Shelly conectado para credencial abc123
📡 StatusOnChange recibido para dispositivo xyz789: { online: true, switchOutput: true }
💾 [BD UPDATE] ANTES - Actualizando Dispositivo1 en BD: { oldRelayOn: false, newRelayOn: true }
📤 Enviando WebSocket update para Dispositivo1: { deviceId: '123', relayOn: true }
```

**Cliente** (`enableWebSocketLogs()`):
```
📱 Actualización de dispositivo recibida: { deviceId: 'xyz789', online: true }
📢 Notificando a 1 suscriptores
```

### Con logs de debug habilitados

**Servidor** (`WEBSOCKET_DEBUG=true`):
```
🔍 [WebSocket DEBUG] Mensaje recibido: { event: 'Shelly:StatusOnChange', deviceId: 'xyz789' }
🔍 [WebSocket DEBUG] Posible evento de estado no reconocido: { method: 'StatusUpdate' }
```

**Cliente** (`enableWebSocketDebug()`):
```
🔍 [FloatingMenu] Mensaje WebSocket recibido: { deviceId: 'xyz789', online: true }
🔍 [LayoutWrapper] Decisión de layout: { isLoginPage: false, shouldShowFullLayout: true }
```

## Beneficios

1. **Consola Limpia**: Sin spam de logs innecesarios (servidor y cliente)
2. **Debug Granular**: Activa solo los logs que necesitas en cada entorno
3. **Producción Lista**: Logs importantes siempre visibles
4. **Fácil Activación**: 
   - Servidor: Variables de entorno
   - Cliente: Comandos en consola del navegador
5. **Control Independiente**: Servidor y cliente se controlan por separado
6. **Sin Reinicios**: Los logs del cliente se controlan en tiempo real 