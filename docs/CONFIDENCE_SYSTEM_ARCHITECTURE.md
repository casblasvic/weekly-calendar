# 🎯 SISTEMA DE CERTEZA INTELIGENTE - ENERGY INSIGHTS

## 📋 **RESUMEN EJECUTIVO**

Sistema avanzado de evaluación de certeza para análisis de anomalías energéticas que proporciona:
- **Certeza global del sistema** basada en madurez de datos
- **Certeza contextual por insight** considerando múltiples factores
- **Estados de madurez del sistema** con mensajes apropiados
- **Preparación para agente IA** con metadatos estructurados

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **Componentes Principales**

```
📁 lib/energy/confidence-calculator.ts
├── 🧮 Motor de Cálculo Global
├── 🎯 Motor de Cálculo Contextual  
├── 📊 Algoritmos de Madurez
└── 🤖 Metadatos para IA

📁 components/energy-insights/confidence-indicator.tsx
├── 🎨 Dashboard de Certeza del Sistema
├── 🃏 Tarjetas de Certeza Contextual
├── 📱 Indicadores Compactos
└── 🔧 Controles Interactivos

📁 app/api/internal/energy-insights/route.ts
├── 🔗 Integración API Principal
├── 🎛️ Filtros por Umbral
├── 📈 Estadísticas de Certeza
└── 🚀 Optimización de Consultas
```

---

## 🎯 **NIVELES DE MADUREZ DEL SISTEMA**

### **1. LEARNING (0-25% certeza)**
```typescript
{
  title: "🤖 Sistema Aprendiendo",
  message: "El sistema está recopilando datos iniciales...",
  subtitle: "Necesitamos más citas completadas para detectar patrones precisos",
  animation: "pulse-learning",
  actionRequired: "Completar más citas con equipos inteligentes",
  estimatedTimeToNext: "1-2 semanas"
}
```

**Características:**
- Perfiles maduros: < 5
- Muestras totales: < 50
- Cobertura de servicios: < 25%
- **Recomendación:** Continuar operación normal, recopilar datos

### **2. TRAINING (25-50% certeza)**
```typescript
{
  title: "📊 Sistema Entrenando", 
  message: "Analizando patrones de consumo energético...",
  subtitle: "Ya detectamos algunos patrones, pero necesitamos más datos",
  animation: "bars-growing",
  actionRequired: "Continuar operación normal",
  estimatedTimeToNext: "1-2 semanas"
}
```

**Características:**
- Perfiles maduros: 5-15
- Muestras totales: 50-200
- Cobertura de servicios: 25-50%
- **Recomendación:** Insights con baja certeza, usar con precaución

### **3. OPERATIONAL (50-75% certeza)**
```typescript
{
  title: "✅ Sistema Operacional",
  message: "Detectando anomalías con confianza suficiente",
  subtitle: "El sistema tiene datos suficientes para detección automática",
  animation: "check-pulse",
  actionRequired: null,
  estimatedTimeToNext: "2-4 semanas"
}
```

**Características:**
- Perfiles maduros: 15-30
- Muestras totales: 200-500
- Cobertura de servicios: 50-75%
- **Recomendación:** Insights confiables para toma de decisiones

### **4. MATURE (75-100% certeza)**
```typescript
{
  title: "🎯 Sistema Maduro",
  message: "Detección de anomalías con alta precisión",
  subtitle: "El sistema ha alcanzado madurez óptima",
  animation: "steady-glow",
  actionRequired: null,
  estimatedTimeToNext: null
}
```

**Características:**
- Perfiles maduros: > 30
- Muestras totales: > 500
- Cobertura de servicios: > 75%
- **Recomendación:** Sistema listo para producción completa

---

## 🧮 **ALGORITMOS DE CÁLCULO**

### **Certeza Global del Sistema**

```typescript
function calculateGlobalConfidenceScore(
  coverage: number,        // 0-1: % servicios con perfiles maduros
  avgSamples: number,      // Promedio muestras por perfil
  quality: QualityMetrics  // Métricas de calidad
): number {
  // Factores ponderados
  const coverageFactor = coverage * 0.4           // 40% peso
  const sampleFactor = Math.min(avgSamples / 50, 1) * 0.3  // 30% peso
  const qualityFactor = (
    quality.variabilityStability * 0.4 +
    quality.temporalCoverage * 0.3 +
    quality.serviceDistribution * 0.3
  ) * 0.3                                         // 30% peso
  
  return (coverageFactor + sampleFactor + qualityFactor) * 100
}
```

### **Certeza Contextual por Insight**

```typescript
function calculateContextualConfidence(factors: ContextualFactors): number {
  // Ponderación de factores contextuales
  const weights = {
    dataAvailability: 0.3,      // Datos históricos disponibles
    employeeExperience: 0.25,   // Experiencia del empleado
    clientHistory: 0.2,         // Historial del cliente
    serviceMaturity: 0.15,      // Madurez del servicio
    temporalContext: 0.05,      // Contexto temporal
    equipmentStability: 0.05    // Estabilidad del equipo
  }
  
  const weightedSum = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + (factors[key] * weight)
  }, 0)
  
  return weightedSum * 100
}
```

### **Factores de Ajuste Contextual**

| Factor | Cálculo | Impacto |
|--------|---------|---------|
| **Empleado Novato** | `experiencia < 0.5` | `-20%` certeza |
| **Datos Insuficientes** | `disponibilidad < 0.3` | `-30%` certeza |
| **Cliente Nuevo** | `historial < 0.4` | `-10%` certeza |
| **Servicio Maduro** | `madurez > 0.8` | `+10%` certeza |
| **Empleado Experto** | `experiencia > 0.8` | `+5%` certeza |
| **Equipo Estable** | `estabilidad > 0.8` | `+3%` certeza |

---

## 📊 **MÉTRICAS DE CALIDAD**

### **Estabilidad de Variabilidad**
```typescript
function calculateVariabilityStability(profiles: Profile[]): number {
  const variabilities = profiles
    .filter(p => p.avgKwhPerMin > 0)
    .map(p => p.stdDevKwhPerMin / p.avgKwhPerMin)
  
  const avgVariability = variabilities.reduce((sum, v) => sum + v, 0) / variabilities.length
  
  // Convertir a estabilidad (inverso de variabilidad)
  return Math.max(0, 1 - avgVariability)
}
```

### **Cobertura Temporal**
```typescript
function calculateTemporalCoverage(profiles: Profile[]): number {
  const hoursWithData = new Set()
  profiles.forEach(p => {
    const hour = new Date(p.createdAt).getHours()
    hoursWithData.add(hour)
  })
  
  // Cobertura de horario laboral (9:00-18:00 = 9 horas)
  return Math.min(1, hoursWithData.size / 9)
}
```

### **Distribución de Servicios**
```typescript
function calculateServiceDistribution(profiles: Profile[], totalServices: number): number {
  const servicesWithProfiles = new Set(profiles.map(p => p.serviceId)).size
  return servicesWithProfiles / totalServices
}
```

---

## 🎯 **CASOS DE USO Y ESCENARIOS**

### **Escenario 1: Sistema Nuevo (Learning)**
```yaml
Situación:
  - Primera semana de operación
  - 3 perfiles creados
  - 25 muestras totales
  - 2 servicios cubiertos de 10 totales

Certeza Global: 15%
Estado: "🤖 Sistema Aprendiendo"
Acción: Continuar recopilando datos
Insights Mostrados: Solo con certeza ≥ 10%
```

### **Escenario 2: Sistema en Entrenamiento (Training)**
```yaml
Situación:
  - Mes de operación
  - 12 perfiles creados (8 maduros)
  - 180 muestras totales
  - 6 servicios cubiertos de 10 totales

Certeza Global: 42%
Estado: "📊 Sistema Entrenando"
Acción: Supervisar insights de alta prioridad
Insights Mostrados: Certeza ≥ 25%
```

### **Escenario 3: Sistema Operacional (Operational)**
```yaml
Situación:
  - 3 meses de operación
  - 28 perfiles creados (22 maduros)
  - 450 muestras totales
  - 8 servicios cubiertos de 10 totales

Certeza Global: 68%
Estado: "✅ Sistema Operacional"
Acción: Usar insights para toma de decisiones
Insights Mostrados: Certeza ≥ 50%
```

### **Escenario 4: Sistema Maduro (Mature)**
```yaml
Situación:
  - 6+ meses de operación
  - 45 perfiles creados (38 maduros)
  - 850 muestras totales
  - 10 servicios cubiertos de 10 totales

Certeza Global: 87%
Estado: "🎯 Sistema Maduro"
Acción: Confianza completa en insights
Insights Mostrados: Certeza ≥ 75%
```

---

## 🤖 **PREPARACIÓN PARA AGENTE IA**

### **Metadatos Estructurados**

```typescript
interface AIMetadata {
  // Certeza global
  systemConfidence: {
    calculationTimestamp: string
    factorsUsed: string[]
    confidenceHistory: number[]
    improvementRate: number
  }
  
  // Certeza contextual
  contextualConfidence: {
    calculationMethod: 'statistical' | 'contextual' | 'hybrid'
    baseConfidence: number
    contextualAdjustment: number
    uncertaintyScore: number
  }
}
```

### **Factores Explicables**

```typescript
interface ExplainableFactors {
  dataAvailability: {
    value: number
    explanation: "Datos históricos suficientes para análisis estadístico"
    impact: "positive" | "negative" | "neutral"
  }
  
  employeeExperience: {
    value: number
    explanation: "Empleado con 150+ citas completadas, baja tasa de anomalías"
    impact: "positive"
  }
  
  // ... más factores
}
```

### **Trazabilidad de Decisiones**

```typescript
interface DecisionTrace {
  baseCalculation: {
    method: string
    inputs: Record<string, any>
    output: number
  }
  
  contextualAdjustments: Array<{
    factor: string
    originalValue: number
    adjustedValue: number
    reason: string
  }>
  
  finalDecision: {
    confidence: number
    threshold: number
    showInsight: boolean
    reasoning: string
  }
}
```

---

## 🔧 **CONFIGURACIÓN Y UMBRALES**

### **Umbrales por Defecto**

```typescript
export const CONFIDENCE_THRESHOLDS = {
  minimumDetection: 10,    // Umbral mínimo para mostrar
  lowConfidence: 25,       // Confianza baja
  mediumConfidence: 50,    // Confianza media
  highConfidence: 75,      // Confianza alta
  productionReady: 85      // Listo para producción
}
```

### **Requisitos de Madurez**

```typescript
export const MATURITY_REQUIREMENTS = {
  [SystemMaturityLevel.LEARNING]: { 
    minProfiles: 5, 
    minSamples: 50 
  },
  [SystemMaturityLevel.TRAINING]: { 
    minProfiles: 15, 
    minSamples: 200 
  },
  [SystemMaturityLevel.OPERATIONAL]: { 
    minProfiles: 30, 
    minSamples: 500 
  },
  [SystemMaturityLevel.MATURE]: { 
    minProfiles: 50, 
    minSamples: 1000 
  }
}
```

---

## 🎨 **COMPONENTES DE INTERFAZ**

### **Dashboard de Certeza del Sistema**

```typescript
<ConfidenceIndicator 
  systemConfidence={systemConfidence}
  variant="system"
  showDetails={true}
/>
```

**Características:**
- Indicador visual de madurez con animaciones
- Métricas de calidad en tiempo real
- Progreso hacia siguiente nivel
- Control de umbrales personalizable

### **Indicador Contextual por Insight**

```typescript
<ConfidenceIndicator 
  contextualConfidence={contextualConfidence}
  variant="insight"
  showDetails={true}
/>
```

**Características:**
- Análisis de factores contextuales
- Explicación de ajustes aplicados
- Factores de riesgo y fortaleza
- Visualización de incertidumbre

### **Indicador Compacto**

```typescript
<ConfidenceIndicator 
  systemConfidence={systemConfidence}
  contextualConfidence={contextualConfidence}
  variant="compact"
/>
```

**Características:**
- Visualización mínima para listas
- Tooltip con información detallada
- Colores adaptativos por nivel
- Iconografía intuitiva

---

## 📈 **MÉTRICAS Y MONITOREO**

### **KPIs del Sistema de Certeza**

| Métrica | Descripción | Objetivo |
|---------|-------------|----------|
| **Certeza Global** | % de confianza del sistema | > 75% |
| **Perfiles Maduros** | Perfiles con ≥20 muestras | > 80% del total |
| **Cobertura de Servicios** | % servicios con perfiles | > 90% |
| **Tasa de Mejora** | Incremento semanal certeza | > 2% |
| **Insights Filtrados** | % insights por baja certeza | < 20% |

### **Alertas y Notificaciones**

```typescript
interface ConfidenceAlerts {
  systemDegradation: "Certeza global < 50% por 3 días"
  lowCoverage: "Cobertura servicios < 60%"
  stagnantImprovement: "Sin mejora por 2 semanas"
  highFilterRate: "> 30% insights filtrados por certeza"
}
```

---

## 🚀 **ROADMAP Y FUTURAS MEJORAS**

### **Fase 1: Implementación Base** ✅
- [x] Motor de cálculo de certeza global
- [x] Motor de cálculo contextual
- [x] Componentes de UI básicos
- [x] Integración con API principal

### **Fase 2: Optimización Avanzada** 🔄
- [ ] Algoritmos de machine learning para predicción
- [ ] Análisis de tendencias temporales
- [ ] Detección automática de degradación
- [ ] Recomendaciones de mejora automáticas

### **Fase 3: Integración IA** 📋
- [ ] Modelo de regresión para predicción de certeza
- [ ] Análisis de sentimientos en recomendaciones
- [ ] Optimización automática de umbrales
- [ ] Feedback loop con resultados reales

### **Fase 4: Escalabilidad** 📋
- [ ] Cache distribuido para cálculos
- [ ] Procesamiento en background
- [ ] API de certeza independiente
- [ ] Dashboard de administración avanzado

---

## 🔍 **TESTING Y VALIDACIÓN**

### **Casos de Prueba**

```typescript
describe('ConfidenceCalculator', () => {
  test('Sistema nuevo debe tener certeza < 25%', () => {
    const result = calculateSystemConfidence(newSystemData)
    expect(result.globalConfidence).toBeLessThan(25)
    expect(result.maturityLevel).toBe(SystemMaturityLevel.LEARNING)
  })
  
  test('Empleado experimentado debe aumentar certeza', () => {
    const result = calculateContextualConfidence(experiencedEmployeeInsight)
    expect(result.adjustedConfidence).toBeGreaterThan(result.insightConfidence)
  })
})
```

### **Validación con Datos Reales**

1. **Comparación con Expertos:** Validar insights de alta certeza con evaluación manual
2. **Análisis de Falsos Positivos:** Medir precisión de insights por nivel de certeza
3. **Feedback de Usuarios:** Recopilar evaluación de utilidad de recomendaciones
4. **Métricas de Negocio:** Correlacionar certeza con impacto en eficiencia operativa

---

## 📚 **REFERENCIAS Y RECURSOS**

### **Documentación Relacionada**
- [ENERGY_INSIGHTS.md](./ENERGY_INSIGHTS.md) - Sistema principal de análisis
- [ANOMALY_DETECTION.md](./ANOMALY_DETECTION.md) - Algoritmos de detección
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) - Preparación para IA

### **Papers y Metodologías**
- Welford's Algorithm para cálculo incremental de varianza
- Bayesian Confidence Intervals para incertidumbre
- Context-Aware Machine Learning para ajustes contextuales

### **Herramientas y Librerías**
- Prisma ORM para gestión de datos
- React Query para cache y sincronización
- Lucide React para iconografía
- Magic UI para componentes avanzados

---

**Última actualización:** `{new Date().toISOString()}`  
**Versión:** `1.0.0`  
**Autor:** Sistema de Documentación Automática 