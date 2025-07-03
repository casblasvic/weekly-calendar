# 📚 DOCUMENTACIÓN COMPLETA - SISTEMA ENCHUFES INTELIGENTES

## 🎯 ÍNDICE DE DOCUMENTACIÓN

Esta carpeta contiene la documentación completa del **Sistema de Enchufes Inteligentes con Estrategia de Dos Niveles** implementado en el SaaS de clínicas.

### 📖 Documentos Disponibles

#### 1. **RESUMEN_EJECUTIVO_IA.md** ⚡ *[LEER PRIMERO]*
**Para**: IA que necesita contexto rápido  
**Tiempo**: 2-3 minutos  
**Contenido**: Resumen súper conciso con lo esencial del sistema

#### 2. **SISTEMA_ENCHUFES_INTELIGENTES_DOS_NIVELES.md** 📋 *[DOCUMENTACIÓN PRINCIPAL]*
**Para**: Comprensión completa del sistema  
**Tiempo**: 15-20 minutos  
**Contenido**: Documentación técnica completa y detallada

#### 3. **COMENTARIOS_CODIGO_ACTUALIZADOS.md** 📝 *[REFERENCIA DE CÓDIGO]*
**Para**: Entender comentarios y estructura del código  
**Tiempo**: 10-15 minutos  
**Contenido**: Comentarios actualizados por archivo con explicaciones

---

## 🚀 FLUJO DE LECTURA RECOMENDADO

### Para IA Nueva en el Proyecto
```
1. RESUMEN_EJECUTIVO_IA.md          (contexto rápido)
2. SISTEMA_ENCHUFES_DOS_NIVELES.md  (detalles completos) 
3. COMENTARIOS_CODIGO_ACTUALIZADOS.md (referencia código)
```

### Para Desarrollador Nuevo
```
1. SISTEMA_ENCHUFES_DOS_NIVELES.md  (comprensión completa)
2. COMENTARIOS_CODIGO_ACTUALIZADOS.md (estructura código)
3. RESUMEN_EJECUTIVO_IA.md          (referencia rápida)
```

### Para Debugging/Mantenimiento
```
1. RESUMEN_EJECUTIVO_IA.md          (contexto inmediato)
2. Sección específica en COMENTARIOS_CODIGO_ACTUALIZADOS.md
```

---

## 🎯 PROBLEMA RESUELTO

**Antes**: Ping-pong online/offline + datos de consumo fantasma  
**Después**: Sistema estable con timeouts inteligentes y UI en tiempo real

---

## ⚡ ESTRATEGIA IMPLEMENTADA

```
NIVEL 1: CONSUMOS (5s)     NIVEL 2: ESTADOS (3min)
├─ Datos críticos          ├─ Datos informativos  
├─ Limpieza rápida         ├─ Timeout conservador
└─ Sin datos fantasma      └─ Sin ping-pong
```

---

## 📁 ARCHIVOS PRINCIPALES MODIFICADOS

### Core System
- `lib/shelly/device-offline-manager.ts` 
- `lib/shelly/websocket-manager.ts`
- `pages/api/socket.js`

### UI Components
- `app/(main)/configuracion/integraciones/EquiposIot/EnchufesInteligentes/page.tsx`
- `components/ui/floating-menu.tsx`
- `hooks/use-smart-plugs-floating-menu.ts`

### Database
- `prisma/schema.prisma`
- `prisma/migrations/20250702184130_*`

---

## 🔄 MANTENIMIENTO

### Logs para Monitoring
```bash
📡 [OfflineManager] Dispositivo activo     # Mensaje WebSocket
⚡ [OfflineManager] Consumo registrado      # Dato válido procesado
🧹 [OfflineManager] Limpiando consumo       # Timeout 5s ejecutado
🔴 [OfflineManager] Estado obsoleto         # Timeout 3min ejecutado
```

### Stats en Runtime
```typescript
deviceOfflineManager.getStats() = {
  isWebSocketConnected: boolean;
  callbacks: number;
  consumptions: number;  // Timeouts activos NIVEL 1
  states: number;        // Dispositivos tracked NIVEL 2
}
```

---

## ✅ VALIDACIÓN DEL SISTEMA

**Indicadores de Funcionamiento Correcto**:
- ✅ No oscilaciones online/offline
- ✅ Consumos desaparecen en máximo 5s sin confirmación
- ✅ Estados offline después de 3min sin actividad
- ✅ UI actualizada instantáneamente
- ✅ BD sincronizada sin bloquear UI

**Flags de Problemas**:
- ❌ Ping-pong cada pocos segundos
- ❌ Consumos mostrados indefinidamente
- ❌ Controles activos en dispositivos offline
- ❌ UI con retrasos o inconsistencias

---

## 📞 CONTACTO/REFERENCIAS

**Implementación**: Estrategia de Dos Niveles  
**Fecha**: Julio 2025  
**Migration**: `20250702184130_add_power_threshold_and_smart_plug_controls`  
**Prisma Import**: `import { prisma } from '@/lib/db';` (consistente en todos los archivos)

---

*Esta documentación garantiza que cualquier IA o desarrollador pueda entender y mantener el sistema sin perder contexto.* 