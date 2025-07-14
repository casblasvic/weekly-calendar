# 📋 ENERGY INSIGHTS - CASOS Y RECOMENDACIONES FINALES

## 📊 **Tabla de Casos Completa - Sistema Actualizado**

Esta documentación define todos los casos posibles en el sistema de Energy Insights actualizado y las recomendaciones específicas que se muestran tanto en el **Modal de Actualización** como en los **Tooltips de Servicio**.

---

## 🎯 **CASOS PRINCIPALES - VARIABILIDAD FUTURA**

### **CASO 1: CONFIGURACIÓN ÓPTIMA** 🟢
- **Condición**: `|avgReal - configured| ≤ 5%`
- **Píldora**: `Óptimo` (verde)
- **Prioridad**: Baja
- **Estado**: No requiere cambios

| Componente | Mensaje/Recomendación |
|------------|----------------------|
| **Modal** | `La configuración actual es óptima (diferencia: X%). No se requieren cambios.` |
| **Tooltip** | `✅ Configuración Óptima - La duración configurada (X min) coincide con la realidad (Y min). Mantener la duración actual y continuar monitoreando.` |
| **Acción** | `Mantener configuración` |

---

### **CASO 2: MEJORADO CON AJUSTES** 🟡
- **Condición**: `5% < |avgReal - configured| ≤ 15%`
- **Píldora**: `Mejorado` (amarillo)
- **Prioridad**: Media
- **Estado**: Ajustes menores recomendados

| Componente | Mensaje/Recomendación |
|------------|----------------------|
| **Modal** | `Se recomienda ajuste menor. Con pequeños cambios, la variabilidad mejorará significativamente.` |
| **Tooltip** | `🔧 Mejorado con Ajustes - Con ajustes menores, la variabilidad se optimizará significativamente. Aplicar las correcciones sugeridas para mejorar la eficiencia.` |
| **Acción** | `Aplicar ajustes menores` |

---

### **CASO 3: CORREGIDO CON CAMBIOS** 🔴
- **Condición**: `|avgReal - configured| > 15%` OR `avgReal > configured`
- **Píldora**: `Corregido` (rojo)
- **Prioridad**: Alta/Crítica
- **Estado**: Correcciones críticas necesarias

| Componente | Mensaje/Recomendación |
|------------|----------------------|
| **Modal** | `Se requieren correcciones críticas. La diferencia actual es significativa y afecta la eficiencia operativa.` |
| **Tooltip** | `🚨 Corregido con Cambios - Con las correcciones aplicadas, el servicio funcionará de manera estable. Implementar las correcciones críticas para evitar problemas.` |
| **Acción** | `Aplicar correcciones críticas` |

---

## 🔄 **LÓGICA DE PRIORIDADES EN BOTONES**

### **BOTÓN "ACTUALIZAR DURACIÓN"**
- **Óptimo**: Verde, texto "Óptimo" - `border-green-500 bg-green-50 text-green-700`
- **Mejorado**: Amarillo, texto "Recomendable" - `border-yellow-500 bg-yellow-50 text-yellow-700`
- **Corregido**: Rojo, texto "Crítico" - `border-red-500 bg-red-50 text-red-700`

---

## 📈 **LÓGICA DEL MODAL DE ACTUALIZACIÓN**

### **NUEVA LÓGICA INTELIGENTE**
```typescript
// 🟢 CASO ÓPTIMO: ≤5% diferencia
if (deviationPct <= 5) {
  status = 'no_changes'
  reason = 'La configuración actual es óptima'
}
// 🟡 CASO MEJORADO: 5-15% diferencia
else if (deviationPct > 5 && deviationPct <= 15) {
  status = 'minor_adjustment'
  reason = 'Ajuste menor recomendado'
}
// 🔴 CASO CORREGIDO: >15% diferencia o real > configurado
else {
  status = 'critical_correction'
  reason = 'Correcciones críticas necesarias'
}
```

---

## 🎨 **COLORES Y ESTILOS**

### **PÍLDORAS DE VARIABILIDAD FUTURA**
- **Óptimo**: `bg-green-100 text-green-700 border-green-300`
- **Mejorado**: `bg-yellow-100 text-yellow-700 border-yellow-300`
- **Corregido**: `bg-red-100 text-red-700 border-red-300`

### **FONDOS DE FILA**
- **Óptimo**: `bg-green-50 border-l-4 border-green-500`
- **Mejorado**: `bg-yellow-50 border-l-4 border-yellow-500`
- **Corregido**: `bg-red-50 border-l-4 border-red-500`

---

## 🔮 **CONCEPTO DE "VARIABILIDAD FUTURA"**

### **¿Qué significa "Variabilidad Futura"?**
La "Variabilidad Futura" muestra **cómo estaría la variabilidad SI se aplicaran las correcciones propuestas**. No es el estado actual, sino el estado **después de optimizar**.

### **Ejemplos Prácticos:**
- **Actual**: Servicio con 30% variabilidad
- **Futuro**: Si se corrige → "Corregido" (rojo) porque necesitó cambios grandes
- **Resultado**: Después de aplicar → variabilidad baja y estable

---

## 🛠️ **RECOMENDACIONES ESPECÍFICAS**

### **MARGEN DE PREPARACIÓN**
- **Recomendación**: La duración de cita debe ser **5-10 minutos mayor** que el tratamiento real
- **Razón**: Tiempo necesario para preparación del paciente y equipo
- **Fórmula**: `Duración Cita = Tratamiento Real + Margen Preparación`

### **UMBRALES DE TOLERANCIA**
- **≤5%**: Diferencia aceptable, no cambios
- **5-15%**: Optimización recomendada
- **>15%**: Corrección obligatoria
- **Real > Configurado**: Prioridad crítica (riesgo de retrasos)

---

## 📊 **MENSAJES DE EQUIPAMIENTO**

### **CONTEO DE SERVICIOS CON ALTA VARIABILIDAD**
```typescript
// 🎯 NUEVA LÓGICA: Contar servicios con variabilidad futura crítica
const highVariabilityCount = services.filter(s => {
  const deviationPct = Math.abs((s.avgReal - s.configured) / s.configured) * 100
  return deviationPct > 15 || s.avgReal > s.configured
}).length
```

### **MENSAJE DINÁMICO**
- **0 servicios**: "Equipamiento optimizado"
- **1-2 servicios**: "X servicios requieren ajustes"
- **3+ servicios**: "X servicios con alta variabilidad"

---

## ✅ **BENEFICIOS DEL SISTEMA**

1. **Consistencia**: Píldora y tooltip muestran el mismo estado futuro
2. **Claridad**: Palabras cortas y descriptivas (Óptimo, Mejorado, Corregido)
3. **Acción**: Recomendaciones específicas y accionables
4. **Predictivo**: Muestra el resultado DESPUÉS de aplicar correcciones
5. **Educativo**: Explica el concepto de margen de preparación
6. **Profesional**: Interfaz limpia sin duplicaciones

---

## 🔄 **ACTUALIZACIÓN DINÁMICA**

### **Comportamiento Esperado**
- **Inicial**: Servicio muestra "Corregido" (necesita cambios)
- **Después de actualizar**: Recalcula y puede mostrar "Óptimo"
- **Tiempo real**: Los mensajes se actualizan conforme cambian los datos
- **Consistencia**: Modal y tooltip siempre sincronizados

Este sistema proporciona una experiencia de usuario coherente, educativa y accionable para la optimización de duraciones de servicios. 