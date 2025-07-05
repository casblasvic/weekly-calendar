# 🔥 SOLUCIÓN CRÍTICA: Race Condition ClinicContext vs Appointment Queries

## ⚠️ ADVERTENCIA CRÍTICA
**NUNCA ELIMINAR** `isInitialized` de las condiciones `enabled` en los hooks de appointments. Esta solución previene un bug crítico que causa múltiples recargas y redirección inesperada a `/dashboard`.

## 🎯 Problema Identificado

### Síntomas del Bug
- **Múltiples recargas innecesarias** de datos de agenda al navegar
- **Redirección inesperada** a `/dashboard` al intentar acceder a la agenda
- Los datos se precargan correctamente pero se vuelven a cargar múltiples veces
- Comportamiento ineficiente y UX frustrante

### Causa Raíz: Race Condition
La race condition ocurría entre `ClinicContext` y los hooks de appointments:

1. **ClinicContext** empieza a cargar clínicas
2. **Establece `activeClinic` temporalmente** (con ID pero sin datos completos)
3. **`useWeekAppointmentsQuery` se ejecuta INMEDIATAMENTE** porque ve `clinicId` e `isAuthenticated`
4. **Mientras `ClinicContext` todavía está cargando** los detalles completos
5. **Resultado**: múltiples requests + redirección a `/dashboard`

### ❌ Condición Problemática (ANTES)
```typescript
enabled: !!clinicId && isAuthenticated
```

### ✅ Condición Corregida (DESPUÉS)
```typescript
enabled: !!clinicId && isAuthenticated && isInitialized
```

## 🛠️ Implementación de la Solución

### Archivos Modificados

#### `lib/hooks/use-appointments-query.ts`
Se modificaron **TODOS** los hooks que realizan queries de appointments:

1. **`useWeekAppointmentsQuery`** - Query principal de semana
2. **`useDayAppointmentsQuery`** - Query de día específico  
3. **`useSlidingAgendaCache`** - Cache de sliding window (3 semanas)

### Cambios Específicos

#### 1. Import del Hook ClinicContext
```typescript
import { useClinic } from '@/contexts/clinic-context';
```

#### 2. Usar isInitialized en cada Hook
```typescript
export function useWeekAppointmentsQuery(weekKey: string, clinicId: string | null) {
  const { data: session, status } = useSession();
  const { isInitialized } = useClinic(); // 🔥 CRÍTICO: Previene race condition
  const isAuthenticated = status === 'authenticated';
  
  return useQuery<WeekAppointmentsResponse, Error>({
    queryKey: ['appointments', 'week', weekKey, clinicId],
    queryFn: () => fetchWeekAppointments(weekKey, clinicId!, isAuthenticated),
    enabled: !!clinicId && isAuthenticated && isInitialized, // 🔥 CRÍTICO
    // ... resto de opciones
  });
}
```

#### 3. Documentación Extensiva en Código
Se añadieron comentarios con emojis 🔥 para marcar la criticidad:
- `// 🔥 CRÍTICO: Previene race condition`
- `// ❌ NUNCA ELIMINAR isInitialized`
- `// 📚 DOCUMENTACIÓN: isInitialized evita que se ejecute antes...`

## 🔍 Cómo Funciona la Solución

### El Flag `isInitialized` en ClinicContext
El `ClinicContext` marca `isInitialized = true` cuando:
1. **Clínicas cargadas** y clínica activa establecida
2. **Detalles completos** de la clínica activa obtenidos  
3. **Estado completamente estable** y listo para uso

### Flujo Corregido
1. **ClinicContext** inicia y marca `isInitialized = false`
2. **Appointment hooks NO se ejecutan** (están esperando)
3. **ClinicContext** completa la inicialización → `isInitialized = true`
4. **Appointment hooks se ejecutan UNA SOLA VEZ** con datos estables
5. **Resultado**: Sin recargas múltiples, sin redirección

## 📊 Beneficios de la Solución

### ✅ Problemas Eliminados
- ❌ Múltiples recargas innecesarias
- ❌ Redirección inesperada a `/dashboard`
- ❌ Race condition entre contextos
- ❌ Requests duplicados e ineficientes

### ✅ Beneficios Conseguidos
- ✅ **UX fluida** sin recargas inesperadas
- ✅ **Carga eficiente** - una sola vez cuando está listo
- ✅ **Navegación estable** sin redirecciones
- ✅ **Rendimiento optimizado** con prefetching correcto

## ⚠️ REGLAS CRÍTICAS PARA FUTURAS MODIFICACIONES

### 🚫 NUNCA ELIMINAR
1. **`isInitialized`** de las condiciones `enabled`
2. **Import de `useClinic`** en `use-appointments-query.ts`
3. **Comentarios marcados con 🔥** - son indicadores críticos

### ⚠️ ANTES DE MODIFICAR
1. **Leer esta documentación** completamente
2. **Entender el problema** que esta solución resuelve
3. **Probar exhaustivamente** cualquier cambio
4. **Verificar** que no reaparezcan múltiples recargas

### 🧪 Testing de Regresión
Para verificar que la solución sigue funcionando:

1. **Acceder a `/agenda`** desde `/dashboard`
2. **Cambiar entre vistas** semana/día múltiples veces
3. **Verificar en Network tab** que no hay requests duplicados
4. **Confirmar** que no hay redirección inesperada a `/dashboard`

## 🎯 Compatibilidad con Prefetching

### Lógicas de Prefetching Preservadas
La solución mantiene **TODAS** las lógicas de prefetching existentes:

- ✅ **Sliding window de 3 semanas** (anterior, actual, siguiente)
- ✅ **Prefetch al cambiar clínica** automático  
- ✅ **Navegación fluida** entre fechas
- ✅ **Prefetch de días adyacentes** en vista diaria
- ✅ **Cache persistente** durante sesión

### Sin Impacto en Rendimiento
- Las queries siguen siendo **igual de rápidas**
- El **prefetching automático** sigue funcionando
- Solo **elimina requests prematuros** e innecesarios

## 📝 Contexto Histórico

### Por Qué se Eliminó Antes
El `isInitialized` existía anteriormente pero fue eliminado por error en una edición, causando la reaparición del bug.

### Prevención Futura
Esta documentación y los comentarios extensivos en código están diseñados para **prevenir eliminaciones accidentales** por parte de futuras IA o desarrolladores.

---

## 🔗 Referencias

- **Archivo principal**: `lib/hooks/use-appointments-query.ts`
- **Contexto relacionado**: `contexts/clinic-context.tsx`
- **Problema reportado**: Múltiples recargas + redirección a `/dashboard`
- **Solución implementada**: Esperar `isInitialized` antes de ejecutar queries

---

**📅 Fecha de implementación**: [Fecha actual]  
**👨‍💻 Implementado por**: Claude Sonnet 4 (Asistente IA)  
**🎯 Propósito**: Cirugía profunda para eliminar race condition crítica 