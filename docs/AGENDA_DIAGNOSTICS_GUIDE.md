# 🔍 Guía de Diagnóstico de Agenda

## 🎯 Propósito

Esta guía explica cómo usar el sistema de diagnóstico implementado para identificar y resolver problemas con citas faltantes o inconsistencias en la agenda.

## 🚀 Activación del Sistema

### 1. Habilitar Diagnósticos
```javascript
// En la consola del navegador
window.agendaDiagnostics.toggle(true);
```

### 2. Comandos Disponibles
```javascript
// Ejecutar diagnóstico manual
window.agendaDiagnostics.run();

// Limpiar IndexedDB y React Query cache
window.agendaDiagnostics.clear();

// Verificar estado actual
window.agendaDiagnostics.isEnabled;
```

### 3. Limpieza Automática de IndexedDB
```javascript
// Marcar IndexedDB para limpieza en próximo reinicio
window.clearIndexedDB();
```

## 📊 Interpretación de Logs

### Logs de Fuente de Datos
```
[WeeklyAgenda] 📊 FUENTE DE DATOS - Servicios: 12 (IndexedDB)
[WeeklyAgenda] 📊 FUENTE DE DATOS - Bonos: IndexedDB
[WeeklyAgenda] 📊 FUENTE DE DATOS - Paquetes: API
[WeeklyAgenda] 📊 FUENTE DE DATOS - Citas: 5 (Cargadas)
```

**Interpretación:**
- `IndexedDB` = Datos vienen del cache local (✅ Óptimo)
- `API` = Datos vienen de llamada al servidor (⚠️ Más lento)
- `Ninguna` = No hay datos disponibles (❌ Problema)

### Logs de Diagnóstico Completo
```
🔍 [AGENDA DIAGNOSTICS] Ejecutando diagnóstico completo...

📊 [AGENDA DIAGNOSTICS] Resumen de datos:
===============================================

🗄️ IndexedDB:
  ["appointments","week","W2025-29","cmd3bwvc40033y2j6sfb0gnak"]: 5 items
    IDs: apt1, apt2, apt3, apt4, apt5
  ["cabins","cmd3bwvc40033y2j6sfb0gnak"]: 3 items
    IDs: cabin1, cabin2, cabin3

🗄️ React Query:
  ["appointments","week","W2025-29","cmd3bwvc40033y2j6sfb0gnak"]: 5 items
    IDs: apt1, apt2, apt3, apt4, apt5

⚠️ [AGENDA DIAGNOSTICS] Detectadas posibles inconsistencias:
  IndexedDB: 5 citas
  React Query: 5 citas

📋 [AGENDA DIAGNOSTICS] Total de IDs únicos encontrados: 5
📋 [AGENDA DIAGNOSTICS] IDs: apt1, apt2, apt3, apt4, apt5
===============================================
```

## 🚨 Identificación de Problemas

### Problema 1: Citas Faltantes
**Síntomas:**
```
⚠️ [WeeklyAgenda] No hay citas - posible problema de datos
[WeeklyAgenda] 📅 CITAS PROCESADAS para 2025-07-16: { total: 0, isDataStable: true, loadingAppointments: false }
```

**Diagnóstico:**
1. Ejecutar `window.agendaDiagnostics.run()`
2. Verificar si hay datos en IndexedDB vs React Query
3. Verificar si las query keys son correctas

**Solución:**
```javascript
// Limpiar cache y empezar desde cero
window.agendaDiagnostics.clear();
```

### Problema 2: Inconsistencias entre IndexedDB y React Query
**Síntomas:**
```
⚠️ [AGENDA DIAGNOSTICS] Detectadas posibles inconsistencias:
  IndexedDB: 8 citas
  React Query: 5 citas
```

**Diagnóstico:**
1. Verificar si hay datos obsoletos en IndexedDB
2. Verificar si hay problemas de sincronización
3. Verificar si las query keys coinciden

**Solución:**
```javascript
// Limpiar IndexedDB manualmente
window.clearIndexedDB();
// Luego reiniciar servidor
```

### Problema 3: Citas Duplicadas
**Síntomas:**
```
⚠️ [WeeklyAgenda] Detectadas citas duplicadas: 2
```

**Diagnóstico:**
1. Verificar si hay problemas en la API
2. Verificar si hay problemas en el cache
3. Verificar si hay problemas en el renderizado

**Solución:**
```javascript
// Limpiar cache y verificar API
window.agendaDiagnostics.clear();
```

### Problema 4: Citas sin ID
**Síntomas:**
```
⚠️ [WeeklyAgenda] Citas sin ID: 1
```

**Diagnóstico:**
1. Verificar estructura de datos de la API
2. Verificar transformación de datos
3. Verificar migration de datos

**Solución:**
- Verificar API response en Network tab
- Verificar transformación de datos en el hook

## 🔧 Flujo de Debugging

### 1. Identificar el Problema
```javascript
// Habilitar diagnósticos
window.agendaDiagnostics.toggle(true);

// Navegar a la semana problemática
// Observar logs automáticos
```

### 2. Ejecutar Diagnóstico Completo
```javascript
// Ejecutar diagnóstico manual
window.agendaDiagnostics.run();

// Analizar resultados en consola
// Identificar inconsistencias
```

### 3. Limpiar y Verificar
```javascript
// Si hay inconsistencias, limpiar cache
window.agendaDiagnostics.clear();

// O marcar para limpieza en próximo reinicio
window.clearIndexedDB();
```

### 4. Verificar Resolución
```javascript
// Recargar página
location.reload();

// Verificar que los datos se cargan correctamente
// Verificar que no hay inconsistencias
```

## 📝 Casos de Uso Comunes

### Caso 1: Después de Actualizaciones de Código
```javascript
// Limpiar cache para evitar problemas de compatibilidad
window.clearIndexedDB();
// Reiniciar servidor
```

### Caso 2: Problemas de Rendimiento
```javascript
// Verificar si los datos vienen de IndexedDB
// Logs deberían mostrar mayoría de datos desde IndexedDB
```

### Caso 3: Citas que Aparecen y Desaparecen
```javascript
// Habilitar diagnósticos
window.agendaDiagnostics.toggle(true);

// Navegar entre semanas
// Observar logs de inconsistencias
```

### Caso 4: Datos Obsoletos
```javascript
// Verificar timestamps en IndexedDB
// Limpiar cache si datos son muy antiguos
window.agendaDiagnostics.clear();
```

## ⚠️ Precauciones

1. **Solo en Desarrollo**: El sistema de diagnóstico solo funciona en `NODE_ENV === 'development'`
2. **Impacto en Rendimiento**: Los diagnósticos consumen recursos, usar solo cuando sea necesario
3. **Limpieza de Cache**: Limpiar IndexedDB eliminará todos los datos cacheados
4. **Reinicio de Servidor**: Algunos problemas requieren reiniciar el servidor después de limpiar cache

## 📈 Métricas de Salud

### Indicadores Positivos
- Mayoría de datos desde IndexedDB
- Números consistentes entre IndexedDB y React Query
- Sin warnings de citas duplicadas o sin ID
- Tiempo de carga < 1 segundo

### Indicadores Negativos
- Mayoría de datos desde API
- Inconsistencias entre fuentes de datos
- Citas duplicadas o sin ID
- Tiempo de carga > 3 segundos

## 🎯 Objetivos del Sistema

1. **Detectar problemas automáticamente** antes de que afecten al usuario
2. **Proporcionar información detallada** para debugging efectivo
3. **Facilitar la limpieza de datos** cuando sea necesario
4. **Monitorear el rendimiento** del sistema de cache continuamente

Este sistema de diagnóstico es una herramienta poderosa para mantener la agenda funcionando de manera óptima y detectar problemas antes de que se conviertan en issues críticos. 