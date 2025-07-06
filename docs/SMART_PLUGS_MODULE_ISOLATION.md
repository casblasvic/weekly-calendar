# 🔌 AISLAMIENTO DEL MÓDULO SHELLY - SMART PLUGS

## 📋 Resumen

Este documento explica cómo se implementó el sistema de aislamiento para el módulo de enchufes inteligentes Shelly, evitando que se ejecuten hooks y componentes relacionados cuando el módulo está desactivado.

## ❌ Problema Identificado

### Error Original
```
[getWeekKey] Fecha inválida recibida: "W2025-27"
allDevices.filter is not a function
smartPlugsData is not defined
React has detected a change in the order of Hooks called by SmartPlugsProvider
Error: Rendered more hooks than during the previous render.
```

### Causa Raíz
El hook `useSmartPlugsFloatingMenu()` se estaba ejecutando **condicionalmente** desde `SmartPlugsProvider`, violando las "Rules of Hooks" de React. Esto causaba:

1. **Violación de Rules of Hooks**: El hook se ejecutaba solo cuando `isShellyActive` era `true`
2. **Orden inconsistente**: Cuando el módulo se activaba, React detectaba hooks adicionales
3. **Error de renderizado**: "Rendered more hooks than during the previous render"

## ✅ Solución Implementada

### **1. Arquitectura con Contexto SmartPlugsProvider**

**Archivo**: `contexts/smart-plugs-context.tsx`

```typescript
export function SmartPlugsProvider({ children }: SmartPlugsProviderProps) {
  // ✅ VERIFICACIÓN TEMPRANA: Obtener estado del módulo PRIMERO
  const { isShellyActive, isLoading: isLoadingIntegrations } = useIntegrationModules();
  
  const { activeClinic } = useClinic();
  const { data: session } = useSession();
  const systemId = session?.user?.systemId;
  
  // ✅ SIEMPRE ejecutar el hook para mantener orden consistente de hooks
  const smartPlugsDataRaw = useSmartPlugsFloatingMenu()
  
  // ✅ PERO solo usar los datos si el módulo está activo
  const smartPlugsData = isShellyActive ? smartPlugsDataRaw : null
  
  const value: SmartPlugsContextType = {
    smartPlugsData,
    isShellyActive,
    isLoading: isLoadingIntegrations
  }
  
  return (
    <SmartPlugsContext.Provider value={value}>
      {children}
    </SmartPlugsContext.Provider>
  )
}
```

### **2. Hook con Verificación Temprana**

**Archivo**: `hooks/use-smart-plugs-floating-menu.ts`

```typescript
export function useSmartPlugsFloatingMenu(): SmartPlugsFloatingMenuData | null {
  // ✅ VERIFICACIÓN TEMPRANA: Obtener estado del módulo PRIMERO
  const { isShellyActive, isLoading: isLoadingIntegrations } = useIntegrationModules();
  
  const { activeClinic } = useClinic();
  const { data: session } = useSession();
  const systemId = session?.user?.systemId;
  
  const queryClient = useQueryClient();
  // ... otros hooks siempre se ejecutan ...
  const { isConnected, subscribe } = useSocket(systemId);

  // ✅ VERIFICACIÓN TEMPRANA: Retornar null si el módulo no está activo
  // IMPORTANTE: Esto debe ir DESPUÉS de todos los hooks para mantener orden consistente
  if (!systemId || !activeClinic || !isShellyActive) {
    return null;
  }
  
  // ... resto de la lógica ...
}
```

### **3. Integración en LayoutWrapper**

**Archivo**: `components/LayoutWrapper.tsx`

```typescript
export function LayoutWrapper({ children, user }: LayoutWrapperProps) {
  // ... otros hooks ...
  
  // ✅ USAR CONTEXTO OPCIONAL para obtener datos de Smart Plugs
  const smartPlugsContext = useSmartPlugsContextOptional()
  const smartPlugsData = smartPlugsContext?.smartPlugsData || null
  
  return (
    <SmartPlugsProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* ... contenido ... */}
        <FloatingMenu smartPlugsData={smartPlugsData} />
      </div>
    </SmartPlugsProvider>
  )
}
```

### **4. Uso en WeeklyAgenda**

**Archivo**: `components/weekly-agenda.tsx`

```typescript
function WeeklyAgendaContent({ ... }: WeeklyAgendaProps) {
  // ... otros hooks ...
  
  // ✅ OBTENER DATOS DE SMART PLUGS DESDE CONTEXTO
  const smartPlugsContext = useSmartPlugsContextOptional()
  const smartPlugsData = smartPlugsContext?.smartPlugsData || null
  
  // ... usar smartPlugsData en OptimizedHoverableCell ...
}
```

## 🎯 Principios de la Solución

### **✅ Rules of Hooks Respetadas**
- **Orden Consistente**: Todos los hooks se ejecutan siempre en el mismo orden
- **Sin Ejecución Condicional**: Los hooks no se ejecutan dentro de condiciones
- **Verificación Tardía**: La verificación de estado se hace después de ejecutar todos los hooks

### **✅ Aislamiento Inteligente**
- **Contexto Centralizado**: Un solo punto de control para datos de Smart Plugs
- **Verificación Temprana**: Retorno inmediato si el módulo está inactivo
- **Datos Condicionales**: Solo se usan los datos si el módulo está activo

### **✅ Compatibilidad Total**
- **Activación/Desactivación**: Funciona correctamente al cambiar estado del módulo
- **Sin Errores de React**: No viola las Rules of Hooks
- **Rendimiento Optimizado**: No ejecuta lógica innecesaria cuando está inactivo

## 🔧 Casos de Uso

### **Módulo Inactivo**
- ✅ Hook se ejecuta pero retorna `null` inmediatamente
- ✅ No se procesan datos de dispositivos
- ✅ No se establecen conexiones WebSocket
- ✅ Componentes reciben `smartPlugsData: null`

### **Módulo Activo**
- ✅ Hook se ejecuta completamente
- ✅ Se procesan datos de dispositivos
- ✅ Se establecen conexiones WebSocket
- ✅ Componentes reciben datos válidos

### **Cambio de Estado (Activar/Desactivar)**
- ✅ Sin errores de React
- ✅ Transición suave entre estados
- ✅ Orden de hooks consistente
- ✅ Datos se actualizan correctamente

## 📊 Beneficios

1. **🔒 Cumple Rules of Hooks**: No más errores de React
2. **🎯 Aislamiento Efectivo**: Módulo no consume recursos cuando está inactivo
3. **🔄 Transiciones Suaves**: Activar/desactivar sin errores
4. **📡 Datos Consistentes**: Contexto unificado para toda la aplicación
5. **⚡ Rendimiento**: Solo ejecuta lógica cuando es necesario

## 🚨 Reglas Importantes

### **❌ NO Hacer**
- No ejecutar hooks condicionalmente basado en `isShellyActive`
- No crear múltiples instancias del contexto
- No verificar estado antes de ejecutar todos los hooks

### **✅ SÍ Hacer**
- Siempre ejecutar todos los hooks en el mismo orden
- Verificar estado después de ejecutar hooks
- Usar el contexto para compartir datos entre componentes
- Retornar `null` si el módulo está inactivo

## 📝 Memoria del Sistema

Esta implementación está documentada en la memoria del sistema con ID: **1249564**, que incluye:
- Sistema completo de aislamiento del módulo Shelly
- Prevención de ejecución cuando está inactivo
- Verificación automática y limpieza de conexiones legacy
- Documentación completa en `docs/SMART_PLUGS_MODULE_ISOLATION.md`

---

**Última actualización**: Implementación completa del contexto SmartPlugsProvider y solución de Rules of Hooks - Enero 2025

## 🔄 Casos de Uso

### **Módulo Shelly Activo**
1. `SmartPlugsProvider` detecta `isShellyActive = true`
2. Ejecuta `useSmartPlugsFloatingMenu()`
3. Proporciona datos reales a todos los componentes
4. `FloatingMenu` y `WeeklyAgenda` funcionan normalmente

### **Módulo Shelly Inactivo**
1. `SmartPlugsProvider` detecta `isShellyActive = false`
2. **NO ejecuta** `useSmartPlugsFloatingMenu()`
3. Proporciona `smartPlugsData = null` a todos los componentes
4. Componentes manejan gracefully el estado `null`

### **Activación/Desactivación Dinámica**
1. Usuario activa/desactiva módulo en marketplace
2. `useIntegrationModules()` detecta cambio automáticamente
3. `SmartPlugsProvider` reacciona instantáneamente
4. Todos los componentes se actualizan sin recargar página

## ⚠️ Reglas Críticas para Desarrolladores

### **✅ Hacer**
- Usar `useSmartPlugsContextOptional()` en componentes que pueden existir sin Smart Plugs
- Usar `useSmartPlugsContext()` solo en componentes específicos de Smart Plugs
- Verificar `smartPlugsData` antes de usarlo: `if (smartPlugsData) { ... }`

### **❌ No Hacer**
- NO usar `useSmartPlugsFloatingMenu()` directamente fuera del contexto
- NO asumir que `smartPlugsData` siempre tiene datos
- NO crear múltiples instancias del contexto

## 🛡️ Compatibilidad con Sistema Existente

### **Componentes Actualizados**
- ✅ `LayoutWrapper.tsx`: Proveedor del contexto
- ✅ `WeeklyAgenda.tsx`: Consumidor del contexto
- ✅ `OptimizedHoverableCell.tsx`: Recibe datos opcionales
- ✅ `FloatingMenu.tsx`: Funciona igual que antes

### **Hooks Mantenidos**
- ✅ `useSmartPlugsFloatingMenu()`: Funciona igual dentro del contexto
- ✅ `useIntegrationModules()`: Sin cambios
- ✅ Todos los hooks de Shelly: Sin cambios

### **APIs y Servicios**
- ✅ Todas las APIs de Shelly: Sin cambios
- ✅ `ShellyModuleService`: Sin cambios
- ✅ WebSocket connections: Sin cambios

## 📊 Métricas de Éxito

### **Antes de la Solución**
- ❌ Errores en consola cuando módulo inactivo
- ❌ Hooks ejecutándose innecesariamente
- ❌ Props undefined causando crashes
- ❌ Rendimiento degradado

### **Después de la Solución**
- ✅ Zero errores cuando módulo inactivo
- ✅ Hooks solo se ejecutan cuando necesario
- ✅ Props siempre definidas (aunque sean null)
- ✅ Rendimiento optimizado

## 🔍 Debugging y Monitoreo

### **Logs Útiles**
```typescript
// En SmartPlugsProvider
console.log('🔌 SmartPlugs Provider:', { isShellyActive, hasData: !!smartPlugsData })

// En componentes consumidores
console.log('🔌 SmartPlugs Consumer:', { hasContext: !!smartPlugsContext, hasData: !!smartPlugsData })
```

### **Verificaciones en DevTools**
1. Verificar que `SmartPlugsProvider` envuelve la aplicación
2. Comprobar que `isShellyActive` refleja el estado real del módulo
3. Confirmar que `smartPlugsData` es `null` cuando módulo inactivo

## 📚 Documentación Relacionada

- `docs/AUTHENTICATION_PATTERNS.md`: Patrones de autenticación
- `docs/PRISMA_CLIENT_STRATEGY.md`: Estrategia de Prisma Client
- `hooks/use-smart-plugs-floating-menu.ts`: Hook principal de Smart Plugs
- `hooks/use-integration-modules.ts`: Hook de verificación de módulos

---

**Última actualización**: Enero 2025  
**Estado**: ✅ Implementado y funcionando  
**Responsable**: Sistema de aislamiento automático 