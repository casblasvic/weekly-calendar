# GHOST SOCKET DETECTION - DETECCIÓN DE SOCKETS FANTASMA

## 📋 **RESUMEN**

Este sistema permite detectar y monitorear conexiones WebSocket no autorizadas que se crean con el hook `useSocket` obsoleto. Facilita la migración completa al nuevo sistema `useIntegratedSocket` eliminando conexiones fantasma.

## 🎯 **PROPÓSITO**

- **Detectar sockets fantasma** creados por el hook `useSocket` obsoleto
- **Facilitar la migración** al nuevo sistema `useIntegratedSocket`
- **Monitorear conexiones** no autorizadas en tiempo real
- **Proporcionar herramientas** para limpiar conexiones fantasma

## 🚨 **PROBLEMA RESUELTO**

### **Antes (Problema)**
```typescript
// ❌ PROBLEMA: Múltiples sistemas de WebSocket
import useSocket from '@/hooks/useSocket'                    // Sistema antiguo
import { useIntegratedSocket } from '@/hooks/use-integrated-socket' // Sistema nuevo

// Resultado: Conexiones duplicadas, logs verbosos, sockets fantasma
```

### **Después (Solución)**
```typescript
// ✅ SOLUCIÓN: Solo sistema integrado
import { useIntegratedSocket } from '@/hooks/use-integrated-socket'

// Resultado: Conexión única, logs limpios, sin sockets fantasma
```

## 🔧 **COMPONENTES DEL SISTEMA**

### **1. Hook Obsoleto con Tracking (useSocket.ts)**
```typescript
// 🔍 REGISTRO GLOBAL DE SOCKETS FANTASMA
const ghostSocketRegistry = new Map<string, { 
  socketId: string; 
  systemId: string; 
  createdAt: Date; 
  stackTrace: string;
}>();

// 🚨 WARNING DE DEPRECIACIÓN automático
console.warn('🚨 [DEPRECATED] useSocket está obsoleto. Migrar a useIntegratedSocket');
```

### **2. Monitor de Consola (ghost-socket-monitor.ts)**
```typescript
// 🌍 FUNCIONES DISPONIBLES EN WINDOW
window.ghostSocketMonitor = {
  inspect: () => void,        // Mostrar sockets fantasma
  clear: () => void,          // Limpiar registro
  startMonitoring: () => void, // Monitoreo continuo
  stopMonitoring: () => void  // Detener monitoreo
};
```

### **3. Provider Cliente (GhostSocketMonitorProvider)**
```typescript
// 🔍 COMPONENTE CLIENTE PARA EVITAR PROBLEMAS DE SSR
"use client";

export function GhostSocketMonitorProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/lib/utils/ghost-socket-monitor').catch(() => {
        console.warn('Ghost Socket Monitor no pudo ser importado');
      });
    }
  }, []);

  return null;
}
```

### **4. Interfaz Visual en WebSocket Manager**
```typescript
// 🎛️ PESTAÑA DE CONFIGURACIÓN EN WEBSOCKET MANAGER
<TabsContent value="configuration">
  <Card>
    <CardTitle>Monitor de Sockets Fantasma</CardTitle>
    <CardContent>
      {/* Controles visuales */}
      <Button onClick={inspectGhostSockets}>Inspeccionar</Button>
      <Button onClick={clearGhostSockets}>Limpiar</Button>
      <Switch onChange={toggleGhostSocketMonitoring} />
      
      {/* Tabla de sockets fantasma */}
      <Table>
        {/* Información detallada de cada socket */}
      </Table>
    </CardContent>
  </Card>
</TabsContent>
```

## 💡 **USO PRÁCTICO**

### **🎛️ Interfaz Visual (Recomendado)**
```
1. Ir a: Configuración > Integraciones > WebSocket Manager
2. Hacer clic en la pestaña "Configuración"
3. Usar los controles visuales:
   - Botón "Inspeccionar" para buscar sockets fantasma
   - Botón "Limpiar" para eliminar el registro
   - Switch "Monitoreo Continuo" para activar/desactivar
   - Ver tabla detallada con información de cada socket fantasma
```

### **🔧 Comandos de Consola (Avanzado)**

#### **Inspeccionar Sockets Fantasma**
```javascript
// Abrir DevTools > Console y ejecutar:
window.ghostSocketMonitor.inspect()

// Resultado si hay sockets fantasma:
// ⚠️ [GHOST SOCKET MONITOR] Sockets fantasma detectados:
// ┌─────────────────────┬──────────────────────┬────────────────────────┬─────────────┐
// │ ghostId             │ socketId             │ systemId               │ ageMinutes  │
// ├─────────────────────┼──────────────────────┼────────────────────────┼─────────────┤
// │ ghost_1703123456789 │ Q2UJoYYo3GMBD6VIAIit │ cmd3bvs1e0006y2j6e55sg │ 2           │
// └─────────────────────┴──────────────────────┴────────────────────────┴─────────────┘
```

#### **Limpiar Registry**
```javascript
// Limpiar todos los sockets fantasma registrados
window.ghostSocketMonitor.clear()

// Resultado:
// 🧹 [GHOST SOCKET MONITOR] 1 sockets fantasma eliminados
```

#### **Monitoreo Continuo**
```javascript
// Iniciar monitoreo cada 30 segundos
window.ghostSocketMonitor.startMonitoring()

// Detener monitoreo
window.ghostSocketMonitor.stopMonitoring()
```

## 📊 **LOGS Y DETECCIÓN**

### **Logs de Socket Fantasma**
```javascript
// Cuando se detecta un socket fantasma:
👻 [GHOST SOCKET] Socket fantasma detectado: {
  ghostId: "ghost_1703123456789_abc123",
  socketId: "Q2UJoYYo3GMBD6VIAIit", 
  systemId: "cmd3bvs1e0006y2j6e55sg66o",
  url: "https://socket-server-qleven.up.railway.app",
  totalGhosts: 1,
  message: "MIGRAR A useIntegratedSocket"
}
```

### **Logs de Limpieza**
```javascript
// Cuando se limpia un socket fantasma:
👻 [GHOST SOCKET] Socket fantasma eliminado: {
  ghostId: "ghost_1703123456789_abc123",
  reason: "io client disconnect",
  totalGhosts: 0
}
```

### **Logs de Depreciación**
```javascript
// Warning automático al usar useSocket:
🚨 [DEPRECATED] useSocket está obsoleto. Migrar a useIntegratedSocket
📖 Ver: hooks/use-integrated-socket.ts
🔗 Docs: docs/WEBSOCKET_INTEGRATION.md
```

## 🔄 **MIGRACIÓN PASO A PASO**

### **Paso 1: Identificar Uso de useSocket**
```bash
# Buscar archivos que usan useSocket
grep -r "useSocket" --include="*.ts" --include="*.tsx" .
```

### **Paso 2: Migrar Importaciones**
```typescript
// ❌ ANTES
import useSocket from '@/hooks/useSocket'

// ✅ DESPUÉS
import { useIntegratedSocket } from '@/hooks/use-integrated-socket'
```

### **Paso 3: Migrar Uso**
```typescript
// ❌ ANTES
const { isConnected, subscribe } = useSocket(systemId)

// ✅ DESPUÉS
const { isConnected, subscribe } = useIntegratedSocket(systemId)
```

### **Paso 4: Verificar Migración**
```javascript
// Verificar que no hay sockets fantasma
window.ghostSocketMonitor.inspect()

// Resultado esperado:
// ✅ No hay sockets fantasma detectados
```

## 🛠️ **TROUBLESHOOTING**

### **"Error de SSR: hooks only work in client components"**
```javascript
// ❌ PROBLEMA: useSocket.ts se importa durante SSR
// ✅ SOLUCIÓN: Implementada con GhostSocketMonitorProvider
// El provider cliente evita problemas de SSR automáticamente
```

### **"No se detectan sockets fantasma pero sigo viendo logs"**
```javascript
// Verificar que todos los componentes migraron
window.ghostSocketMonitor.inspect()

// Si totalGhosts = 0 pero siguen los logs:
// 1. Verificar que no hay imports cached de useSocket
// 2. Reiniciar el servidor de desarrollo
// 3. Limpiar cache del navegador
```

### **"Monitor no disponible en consola"**
```javascript
// Verificar que se importó correctamente
if (window.ghostSocketMonitor) {
  console.log('✅ Monitor disponible');
} else {
  console.log('❌ Monitor no disponible');
  // Solución: Verificar que esté en development mode
  // y que GhostSocketMonitorProvider esté en el layout
}
```

### **"Error al importar useSocket"**
```javascript
// Si el hook useSocket fue eliminado completamente:
// ✅ Esto es normal después de migración completa
// El monitor mostrará: "Hook useSocket no disponible (posiblemente ya migrado)"
```

## 📈 **MÉTRICAS DE ÉXITO**

### **Migración Exitosa**
- ✅ **Interfaz Visual**: WebSocket Manager > Configuración muestra "Sin sockets fantasma detectados"
- ✅ **Consola**: `window.ghostSocketMonitor.inspect()` retorna `totalGhosts: 0`
- ✅ **Logs**: No hay logs de `[useSocket-DEPRECATED]` en consola
- ✅ **Logs**: No hay logs de `[GHOST SOCKET]` en consola
- ✅ **Logs**: Solo logs de `[IntegratedSocket]` en consola
- ✅ **Badge**: No aparece badge rojo en la pestaña "Configuración"

### **Migración Pendiente**
- ❌ **Interfaz Visual**: WebSocket Manager > Configuración muestra X sockets fantasma detectados
- ❌ **Consola**: `window.ghostSocketMonitor.inspect()` retorna `totalGhosts > 0`
- ❌ **Logs**: Logs de `[useSocket-DEPRECATED]` en consola
- ❌ **Logs**: Logs de `[GHOST SOCKET]` en consola
- ❌ **Logs**: Logs verbosos de conexión Socket.io
- ❌ **Badge**: Badge rojo con número en la pestaña "Configuración"

## 🎯 **BENEFICIOS**

### **Performance**
- **Menos conexiones WebSocket** (eliminación de duplicados)
- **Menos logs verbosos** (reducción de spam en consola)
- **Mejor gestión de memoria** (limpieza automática)

### **Mantenibilidad**
- **Sistema centralizado** (todo por WebSocket Manager)
- **Logs estructurados** (fácil debugging)
- **Migración gradual** (detección automática)

### **Observabilidad**
- **Detección en tiempo real** de sockets fantasma
- **Monitoreo continuo** desde consola
- **Métricas claras** de migración

## 🔗 **ARCHIVOS RELACIONADOS**

```
hooks/
├── useSocket.ts                     # ❌ Hook obsoleto con tracking
├── use-integrated-socket.ts         # ✅ Hook recomendado
└── use-smart-plugs-floating-menu.ts # ✅ Migrado

lib/utils/
└── ghost-socket-monitor.ts          # 🔍 Monitor de consola

components/providers/
└── ghost-socket-monitor-provider.tsx # 🔄 Provider cliente (evita SSR)

app/(main)/configuracion/integraciones/
└── websocket-manager/
    └── page.tsx                     # 🎛️ Interfaz visual del WebSocket Manager

docs/
├── WEBSOCKET_INTEGRATION.md         # 📖 Documentación principal
└── GHOST_SOCKET_DETECTION.md        # 📖 Este archivo
```

## 📞 **COMANDOS ÚTILES**

### **🎛️ Interfaz Visual (Recomendado)**
```
1. Ir a: /configuracion/integraciones/websocket-manager
2. Hacer clic en la pestaña "Configuración"
3. Usar los controles visuales para monitorear sockets fantasma
```

### **🔧 Comandos de Consola**
```javascript
// Inspección rápida
window.ghostSocketMonitor.inspect()

// Limpieza completa
window.ghostSocketMonitor.clear()

// Monitoreo durante desarrollo
window.ghostSocketMonitor.startMonitoring()

// Verificar estado del registry
window.ghostSocketMonitor.getRegistry().then(console.log)
```

---

**✅ ESTADO ACTUAL**: Sistema implementado y funcional.
**🎯 OBJETIVO**: Eliminar completamente el hook useSocket obsoleto.
**📅 SIGUIENTE**: Continuar migración de componentes restantes. 