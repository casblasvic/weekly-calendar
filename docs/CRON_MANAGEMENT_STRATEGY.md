# 🕐 SISTEMA CENTRALIZADO DE GESTIÓN DE CRONS

## 📋 OBJETIVO PRINCIPAL

**Centralizar TODOS los trabajos programados (crons) en un solo punto de gestión para:**
- Evitar duplicación de trabajos
- Facilitar mantenimiento y debugging
- Permitir activación/desactivación fácil
- Generar reportes de ejecución
- Tener control total sobre recursos del sistema

---

## 🎯 ARQUITECTURA DEL SISTEMA

### Componentes Principales

#### 1. **CronManager** - Gestor Central
```typescript
// lib/cron/cron-manager.ts
export class CronManager {
  private jobs = new Map<string, CronJobConfig>()
  private executionStatus = new Map<string, CronExecutionStatus>()
  private runningJobs = new Set<string>()
}
```

#### 2. **CronJobConfig** - Configuración de Trabajos
```typescript
export interface CronJobConfig {
  id: string                    // Identificador único
  name: string                  // Nombre descriptivo
  schedule: string              // Expresión cron: "0 2 * * *"
  enabled: boolean              // Estado activo/inactivo
  category: string              // Categoría para organización
  priority: string              // Prioridad de ejecución
  maxRetries: number            // Reintentos automáticos
  timeoutMinutes: number        // Timeout máximo
  handler: () => Promise<void>  // Función a ejecutar
  documentation: string         // Documentación completa
}
```

#### 3. **CronExecutionStatus** - Estado de Ejecución
```typescript
export interface CronExecutionStatus {
  cronId: string
  lastExecution?: Date
  lastSuccess?: Date
  lastError?: Date
  errorCount: number
  totalExecutions: number
  avgExecutionTime: number
  isRunning: boolean
}
```

---

## 📊 CRONS REGISTRADOS ACTUALMENTE

### 🎯 **CRON #1: confidence-full-recalculation** 
**⚠️ CRÍTICO - SISTEMA HÍBRIDO INCREMENTAL**

```typescript
{
  id: 'confidence-full-recalculation',
  name: 'Recálculo Completo de Certeza',
  schedule: '0 2 * * *',        // 2:00 AM todos los días
  enabled: true,                 // ✅ ACTIVO
  category: 'confidence',
  priority: 'high',
  maxRetries: 3,
  timeoutMinutes: 30
}
```

**Función:** Recalcula completamente las métricas de certeza del sistema
**Importancia:** CRÍTICO para mantener precisión del algoritmo Welford
**Proceso:**
1. Obtener todos los sistemas activos
2. Recalcular certeza completa para cada sistema
3. Comparar con métricas incrementales
4. Actualizar tabla `system_confidence_metrics`
5. Marcar como recálculo completo

**Tiempo estimado:** 5-15 minutos según volumen de datos

### 🧹 **CRON #2: energy-data-cleanup**
**[PENDIENTE DE IMPLEMENTACIÓN]**

```typescript
{
  id: 'energy-data-cleanup',
  name: 'Limpieza de Datos Energéticos',
  schedule: '0 3 * * 0',        // 3:00 AM todos los domingos
  enabled: false,               // ❌ DESHABILITADO
  category: 'cleanup',
  priority: 'medium',
  maxRetries: 2,
  timeoutMinutes: 60
}
```

**Función:** Limpia datos energéticos antiguos para optimizar rendimiento
**Proceso planeado:**
- Eliminar muestras de energía > 90 días
- Consolidar datos históricos
- Optimizar índices de base de datos
- Generar reportes de limpieza

### 💾 **CRON #3: critical-metrics-backup**
**[PENDIENTE DE IMPLEMENTACIÓN]**

```typescript
{
  id: 'critical-metrics-backup',
  name: 'Backup de Métricas Críticas',
  schedule: '0 4 * * *',        // 4:00 AM todos los días
  enabled: false,               // ❌ DESHABILITADO
  category: 'backup',
  priority: 'high',
  maxRetries: 3,
  timeoutMinutes: 20
}
```

**Función:** Respalda métricas críticas del sistema para recuperación
**Proceso planeado:**
- Backup de `system_confidence_metrics`
- Backup de perfiles energéticos
- Backup de configuraciones críticas
- Verificación de integridad de backups

---

## 🚀 USO DEL SISTEMA

### Registrar Nuevo Cron

```typescript
import { cronManager } from '@/lib/cron/cron-manager'

// Registrar nuevo trabajo
cronManager.registerJob({
  id: 'mi-nuevo-cron',
  name: 'Mi Nuevo Trabajo',
  description: 'Descripción del trabajo',
  schedule: '0 6 * * *',        // 6:00 AM diario
  enabled: true,
  category: 'maintenance',
  priority: 'medium',
  maxRetries: 2,
  timeoutMinutes: 15,
  handler: async () => {
    // Lógica del trabajo
    console.log('Ejecutando mi trabajo...')
  },
  createdAt: new Date(),
  lastModified: new Date(),
  author: 'Tu Nombre',
  documentation: `
    📋 DOCUMENTACIÓN COMPLETA DEL TRABAJO
    
    Descripción detallada de qué hace el trabajo:
    - Paso 1: ...
    - Paso 2: ...
    
    ⚠️ PRECAUCIONES:
    - Precaución 1
    - Precaución 2
    
    🔄 PROCESO:
    1. Paso detallado 1
    2. Paso detallado 2
    
    ⏱️ TIEMPO ESTIMADO: X minutos
  `
})
```

### Ejecutar Cron Manualmente

```typescript
import { executeCronJob } from '@/lib/cron/cron-manager'

// Ejecutar trabajo específico
const report = await executeCronJob('confidence-full-recalculation', true)
console.log('Reporte:', report)
```

### Obtener Estado de Crons

```typescript
import { getAllCronJobsStatus, generateCronReport } from '@/lib/cron/cron-manager'

// Estado de todos los crons
const status = getAllCronJobsStatus()

// Reporte completo
const report = generateCronReport()
console.log('Resumen:', report.summary)
console.log('Trabajos:', report.jobs)
```

### Habilitar/Deshabilitar Cron

```typescript
import { setCronJobEnabled } from '@/lib/cron/cron-manager'

// Deshabilitar cron
setCronJobEnabled('energy-data-cleanup', false)

// Habilitar cron
setCronJobEnabled('confidence-full-recalculation', true)
```

---

## 🔧 INTEGRACIÓN CON APIS

### API para Gestión de Crons

```typescript
// app/api/internal/crons/route.ts
import { getAllCronJobsStatus, executeCronJob } from '@/lib/cron/cron-manager'

export async function GET() {
  const status = getAllCronJobsStatus()
  return NextResponse.json(status)
}

export async function POST(request: Request) {
  const { cronId, force } = await request.json()
  
  try {
    const report = await executeCronJob(cronId, force)
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

### API para Ejecutar Cron Específico

```typescript
// app/api/internal/crons/[cronId]/execute/route.ts
import { executeCronJob } from '@/lib/cron/cron-manager'

export async function POST(
  request: Request,
  { params }: { params: { cronId: string } }
) {
  try {
    const report = await executeCronJob(params.cronId, true)
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

---

## 📊 MONITOREO Y REPORTES

### Métricas Disponibles

```typescript
// Reporte completo del sistema
const report = generateCronReport()

// Métricas del resumen
console.log('Total de trabajos:', report.summary.totalJobs)
console.log('Trabajos habilitados:', report.summary.enabledJobs)
console.log('Trabajos ejecutándose:', report.summary.runningJobs)
console.log('Trabajos con errores:', report.summary.errorJobs)

// Detalles por trabajo
report.jobs.forEach(job => {
  console.log(`${job.id}:`)
  console.log(`  - Última ejecución: ${job.lastExecution}`)
  console.log(`  - Errores consecutivos: ${job.errorCount}`)
  console.log(`  - Tiempo promedio: ${job.avgExecutionTime}ms`)
  console.log(`  - Estado: ${job.isRunning ? 'Ejecutándose' : 'Inactivo'}`)
})
```

### Dashboard de Crons (Futuro)

```typescript
// Componente React para dashboard
export function CronDashboard() {
  const [cronStatus, setCronStatus] = useState([])
  
  useEffect(() => {
    fetch('/api/internal/crons')
      .then(res => res.json())
      .then(setCronStatus)
  }, [])
  
  return (
    <div className="cron-dashboard">
      <h2>🕐 Estado de Crons</h2>
      {cronStatus.map(cron => (
        <div key={cron.id} className="cron-card">
          <h3>{cron.name}</h3>
          <p>Estado: {cron.enabled ? '✅ Activo' : '❌ Inactivo'}</p>
          <p>Última ejecución: {cron.lastExecution}</p>
          <p>Errores: {cron.errorCount}</p>
          <button onClick={() => executeCron(cron.id)}>
            🚀 Ejecutar
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## ⚠️ REGLAS Y MEJORES PRÁCTICAS

### **🚫 PROHIBIDO:**
1. **NO crear crons fuera del sistema centralizado**
2. **NO duplicar trabajos existentes**
3. **NO modificar crons críticos sin documentar**
4. **NO crear crons sin timeout**
5. **NO crear crons sin manejo de errores**

### **✅ OBLIGATORIO:**
1. **Documentar completamente cada cron**
2. **Definir timeout apropiado**
3. **Configurar reintentos máximos**
4. **Categorizar correctamente**
5. **Probar antes de habilitar**

### **📋 CHECKLIST PARA NUEVOS CRONS:**
- [ ] ID único y descriptivo
- [ ] Nombre claro y conciso
- [ ] Expresión cron correcta
- [ ] Categoría apropiada
- [ ] Prioridad definida
- [ ] Timeout configurado
- [ ] Reintentos configurados
- [ ] Handler implementado
- [ ] Documentación completa
- [ ] Pruebas realizadas

---

## 🔄 EXPRESIONES CRON COMUNES

```bash
# Cada minuto
* * * * *

# Cada hora
0 * * * *

# Diario a las 2:00 AM
0 2 * * *

# Semanal (domingos a las 3:00 AM)
0 3 * * 0

# Mensual (primer día del mes a las 4:00 AM)
0 4 1 * *

# Cada 15 minutos
*/15 * * * *

# Cada 6 horas
0 */6 * * *

# Días laborables a las 9:00 AM
0 9 * * 1-5

# Fines de semana a las 10:00 AM
0 10 * * 6,0
```

---

## 🚨 PROCEDIMIENTOS DE EMERGENCIA

### Si un Cron Falla Constantemente

1. **Deshabilitar inmediatamente:**
   ```typescript
   setCronJobEnabled('cron-problematico', false)
   ```

2. **Revisar logs de error:**
   ```typescript
   const status = getAllCronJobsStatus()
   const problematicCron = status.find(c => c.id === 'cron-problematico')
   console.log('Errores:', problematicCron.errorCount)
   console.log('Última ejecución:', problematicCron.lastExecution)
   ```

3. **Investigar causa raíz**
4. **Corregir problema**
5. **Probar manualmente:**
   ```typescript
   await executeCronJob('cron-problematico', true)
   ```

6. **Rehabilitar si funciona:**
   ```typescript
   setCronJobEnabled('cron-problematico', true)
   ```

### Si el Sistema de Crons se Satura

1. **Verificar trabajos ejecutándose:**
   ```typescript
   const report = generateCronReport()
   console.log('Trabajos ejecutándose:', report.summary.runningJobs)
   ```

2. **Deshabilitar crons no críticos temporalmente**
3. **Aumentar timeouts si es necesario**
4. **Revisar recursos del sistema**

---

## 📈 EVOLUCIÓN FUTURA

### Mejoras Planeadas

1. **Tabla de Reportes de Ejecución**
   - Historial detallado de ejecuciones
   - Métricas de rendimiento
   - Análisis de tendencias

2. **Dashboard Web Completo**
   - Visualización en tiempo real
   - Controles de activación/desactivación
   - Gráficos de rendimiento

3. **Alertas Automáticas**
   - Notificaciones por fallos
   - Alertas por timeouts
   - Reportes de salud del sistema

4. **Cron Scheduler Automático**
   - Integración con node-cron
   - Ejecución automática programada
   - Manejo de zonas horarias

5. **Métricas Avanzadas**
   - Análisis de carga del sistema
   - Optimización de horarios
   - Predicción de recursos

---

## 🎯 CONCLUSIÓN

El sistema centralizado de gestión de crons proporciona:

- ✅ **Control total** sobre todos los trabajos programados
- ✅ **Organización clara** con categorías y prioridades
- ✅ **Monitoreo completo** de ejecuciones y errores
- ✅ **Documentación automática** de cada trabajo
- ✅ **Facilidad de mantenimiento** y debugging
- ✅ **Escalabilidad** para futuros trabajos

**Usar SIEMPRE este sistema para cualquier trabajo programado en la aplicación.**

---

*Documentación actualizada: 2024-12-26*
*Próxima revisión: Después de implementar dashboard web* 