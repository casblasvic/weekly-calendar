# 🕒 CRON MANAGER - ANÁLISIS DE IMPLEMENTACIÓN

## 🎯 NECESIDAD IDENTIFICADA

Actualmente la aplicación tiene varias tareas que requieren ejecución programada:

### 📋 Tareas Actuales que Necesitan Programación:
1. **Limpieza de logs WebSocket** (cada 24 horas)
2. **Sincronización de dispositivos Shelly** (cada 5 minutos)
3. **Verificación de actualizaciones Socket.io** (semanal)
4. **Limpieza de sesiones WebSocket expiradas** (diaria)
5. **Backup automático de configuraciones** (diaria)
6. **Reportes automáticos de estadísticas** (semanal/mensual)
7. **Limpieza de archivos temporales** (diaria)
8. **Verificación de salud del sistema** (cada hora)

### 🚨 Problemas Actuales:
- **No hay centralización** de tareas programadas
- **Configuración dispersa** en diferentes archivos
- **Sin monitoreo** de ejecución de tareas
- **Sin logs** de éxito/fallo de tareas
- **Sin interfaz** para gestionar horarios
- **Sin alertas** cuando fallan tareas críticas

## 🏗️ ARQUITECTURA PROPUESTA

### 📊 TABLAS DE BASE DE DATOS

```sql
-- Definiciones de trabajos cron
model CronJob {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  schedule    String   // Expresión cron (ej: "0 2 * * *")
  command     String   // Comando o función a ejecutar
  isActive    Boolean  @default(true)
  
  // Configuración
  timeout     Int?     // Timeout en segundos
  retries     Int      @default(0)
  retryDelay  Int      @default(60) // Segundos entre reintentos
  
  // Metadatos
  category    String?  // "CLEANUP", "SYNC", "BACKUP", etc.
  priority    Int      @default(5) // 1-10 (1 = alta prioridad)
  
  // Restricciones
  maxRuntime  Int?     // Máximo tiempo de ejecución en segundos
  allowConcurrent Boolean @default(false)
  
  // Sistema
  systemId    String
  system      System   @relation(fields: [systemId], references: [id])
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastRunAt   DateTime?
  nextRunAt   DateTime?
  
  // Relaciones
  executions  CronExecution[]
  
  @@index([systemId])
  @@index([isActive])
  @@index([nextRunAt])
  @@index([category])
}

-- Historial de ejecuciones
model CronExecution {
  id          String    @id @default(cuid())
  jobId       String
  job         CronJob   @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  // Estado
  status      String    // "running", "success", "failed", "timeout"
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  duration    Int?      // Duración en milisegundos
  
  // Resultado
  output      String?   @db.Text
  errorMessage String?  @db.Text
  exitCode    Int?
  
  // Contexto
  triggeredBy String?   // "schedule", "manual", "retry"
  attempt     Int       @default(1)
  
  // Métricas
  memoryUsed  Int?      // MB
  cpuUsed     Float?    // Porcentaje
  
  @@index([jobId])
  @@index([status])
  @@index([startedAt])
}

-- Configuración del sistema cron
model CronSettings {
  id              String   @id @default(cuid())
  systemId        String   @unique
  system          System   @relation(fields: [systemId], references: [id])
  
  // Configuración global
  isEnabled       Boolean  @default(true)
  maxConcurrentJobs Int    @default(5)
  defaultTimeout  Int      @default(3600) // 1 hora
  
  // Limpieza automática
  keepExecutions  Int      @default(1000) // Mantener últimas 1000 ejecuciones
  cleanupDays     Int      @default(30)   // Limpiar ejecuciones > 30 días
  
  // Notificaciones
  alertOnFailure  Boolean  @default(true)
  alertEmail      String?
  slackWebhook    String?
  
  // Timezone
  timezone        String   @default("Europe/Madrid")
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 🎛️ COMPONENTES PRINCIPALES

#### 1. **Cron Scheduler Service**
```typescript
class CronSchedulerService {
  private jobs = new Map<string, NodeJS.Timeout>();
  private runningJobs = new Set<string>();
  
  async start() {
    // Cargar trabajos activos de BD
    // Programar ejecuciones
    // Iniciar monitoring
  }
  
  async scheduleJob(job: CronJob) {
    // Programar usando node-cron o similar
  }
  
  async executeJob(jobId: string, triggeredBy: string) {
    // Ejecutar trabajo con logging completo
  }
  
  async stopJob(jobId: string) {
    // Detener trabajo programado
  }
}
```

#### 2. **Cron Manager UI**
```typescript
// Página: /configuracion/sistema/cron-manager
interface CronManagerPage {
  // Lista de trabajos con estado
  // Editor de expresiones cron
  // Logs de ejecución en tiempo real
  // Configuración global
  // Métricas y estadísticas
}
```

#### 3. **Job Executors**
```typescript
// Ejecutores específicos por categoría
class WebSocketCleanupExecutor implements CronExecutor {
  async execute(params: any): Promise<CronResult> {
    // Lógica de limpieza de logs WebSocket
  }
}

class ShellysyncExecutor implements CronExecutor {
  async execute(params: any): Promise<CronResult> {
    // Lógica de sincronización Shelly
  }
}
```

## 🔧 IMPLEMENTACIÓN TÉCNICA

### 📦 Dependencias Requeridas
```json
{
  "node-cron": "^3.0.2",        // Programación de tareas
  "cron-parser": "^4.8.1",     // Parsing de expresiones cron
  "pidusage": "^3.0.2",        // Métricas de CPU/memoria
  "node-schedule": "^2.1.1"    // Alternativa más robusta
}
```

### 🚀 Flujo de Inicialización
```typescript
// En startup de la aplicación
export async function initializeCronManager() {
  const cronService = new CronSchedulerService();
  
  // 1. Cargar configuración
  await cronService.loadSettings();
  
  // 2. Registrar ejecutores
  cronService.registerExecutor('websocket_cleanup', new WebSocketCleanupExecutor());
  cronService.registerExecutor('shelly_sync', new ShellySyncExecutor());
  
  // 3. Cargar trabajos activos
  await cronService.loadActiveJobs();
  
  // 4. Iniciar scheduler
  await cronService.start();
  
  return cronService;
}
```

### 📋 Trabajos Predefinidos

#### 1. **Limpieza de Logs WebSocket**
```json
{
  "name": "websocket_logs_cleanup",
  "description": "Limpieza automática de logs WebSocket antiguos",
  "schedule": "0 2 * * *",
  "command": "websocket_cleanup",
  "category": "CLEANUP",
  "priority": 7,
  "timeout": 1800,
  "params": {
    "olderThanDays": 7,
    "maxLogsPerConnection": 1000
  }
}
```

#### 2. **Sincronización Shelly**
```json
{
  "name": "shelly_device_sync",
  "description": "Sincronización periódica de dispositivos Shelly",
  "schedule": "*/5 * * * *",
  "command": "shelly_sync",
  "category": "SYNC",
  "priority": 8,
  "timeout": 300,
  "allowConcurrent": false
}
```

#### 3. **Verificación de Actualizaciones**
```json
{
  "name": "check_updates",
  "description": "Verificar actualizaciones de dependencias",
  "schedule": "0 9 * * 1",
  "command": "check_updates",
  "category": "MAINTENANCE",
  "priority": 5,
  "params": {
    "checkSocketIO": true,
    "checkPrisma": true,
    "checkNextJS": true
  }
}
```

## 🎨 INTERFAZ DE USUARIO

### 📊 Dashboard Principal
```typescript
interface CronDashboard {
  // Estadísticas generales
  totalJobs: number;
  activeJobs: number;
  runningJobs: number;
  failedJobs: number;
  
  // Próximas ejecuciones
  upcomingJobs: CronJob[];
  
  // Ejecuciones recientes
  recentExecutions: CronExecution[];
  
  // Métricas de rendimiento
  avgExecutionTime: number;
  successRate: number;
}
```

### ⚙️ Editor de Trabajos
```typescript
interface CronJobEditor {
  // Información básica
  name: string;
  description: string;
  category: string;
  
  // Programación
  schedule: string;        // Con validador visual
  timezone: string;
  
  // Configuración
  timeout: number;
  retries: number;
  priority: number;
  allowConcurrent: boolean;
  
  // Comando y parámetros
  command: string;
  params: Record<string, any>;
}
```

### 📈 Monitoreo en Tiempo Real
```typescript
interface CronMonitoring {
  // Estado en vivo
  currentlyRunning: CronExecution[];
  
  // Logs en tiempo real
  liveLogs: string[];
  
  // Métricas del sistema
  systemLoad: {
    cpu: number;
    memory: number;
    activeCrons: number;
  };
  
  // Alertas activas
  alerts: CronAlert[];
}
```

## 🔒 SEGURIDAD Y CONTROL

### 🛡️ Medidas de Seguridad
1. **Validación de comandos** - Whitelist de ejecutores permitidos
2. **Timeouts obligatorios** - Evitar procesos zombi
3. **Límites de recursos** - CPU/memoria máxima por trabajo
4. **Logs de auditoría** - Quién ejecutó qué y cuándo
5. **Permisos granulares** - Solo admins pueden crear/editar trabajos críticos

### ⚠️ Gestión de Fallos
```typescript
interface FailureHandling {
  // Reintentos automáticos
  maxRetries: number;
  retryDelay: number;
  backoffStrategy: 'linear' | 'exponential';
  
  // Notificaciones
  alertOnFailure: boolean;
  alertChannels: ('email' | 'slack' | 'webhook')[];
  
  // Escalación
  escalateAfter: number; // Fallos consecutivos
  disableAfter: number;  // Fallos para deshabilitar
}
```

## 📈 MÉTRICAS Y ALERTAS

### 📊 Métricas Importantes
- **Tasa de éxito** por trabajo
- **Tiempo promedio** de ejecución
- **Uso de recursos** (CPU/memoria)
- **Trabajos en cola** vs capacidad
- **Fallos consecutivos**

### 🚨 Alertas Configurables
- Trabajo falló más de X veces
- Ejecución superó timeout
- Sistema sobrecargado (>80% CPU)
- Trabajo crítico no ejecutado en X tiempo
- Disco lleno afectando logs

## 🎯 CASOS DE USO ESPECÍFICOS

### 1. **Plugin Shelly**
```typescript
// Sincronización automática cada 5 minutos
const shellySync = {
  schedule: "*/5 * * * *",
  executor: async () => {
    const credentials = await getShellyCredentials();
    for (const cred of credentials) {
      await syncShellyDevices(cred.id);
    }
  }
};
```

### 2. **WebSocket Manager**
```typescript
// Limpieza diaria de logs
const wsCleanup = {
  schedule: "0 2 * * *",
  executor: async () => {
    await cleanupLogs({
      olderThanDays: 7,
      maxLogsPerConnection: 1000
    });
  }
};
```

### 3. **Sistema General**
```typescript
// Backup semanal
const backup = {
  schedule: "0 3 * * 0",
  executor: async () => {
    await createSystemBackup();
    await uploadToCloud();
    await cleanOldBackups();
  }
};
```

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: **Core System** (1-2 semanas)
1. Crear modelos de BD (CronJob, CronExecution, CronSettings)
2. Implementar CronSchedulerService básico
3. APIs para CRUD de trabajos
4. Ejecutores básicos (limpieza, sync)

### Fase 2: **UI Management** (1 semana)
1. Dashboard de trabajos
2. Editor de trabajos con validación
3. Logs de ejecución en tiempo real
4. Configuración global

### Fase 3: **Advanced Features** (1 semana)
1. Métricas y alertas
2. Notificaciones (email/slack)
3. Gestión avanzada de fallos
4. Optimizaciones de rendimiento

### Fase 4: **Integration** (1 semana)
1. Integrar trabajos existentes
2. Migrar tareas actuales al nuevo sistema
3. Testing exhaustivo
4. Documentación completa

## 💡 RECOMENDACIÓN FINAL

**SÍ, definitivamente deberíamos implementar un Cron Manager** por las siguientes razones:

### ✅ Ventajas Críticas:
1. **Centralización** - Un solo lugar para gestionar todas las tareas programadas
2. **Visibilidad** - Monitoreo en tiempo real de todas las ejecuciones
3. **Fiabilidad** - Gestión robusta de fallos y reintentos
4. **Escalabilidad** - Fácil agregar nuevas tareas sin tocar código core
5. **Mantenimiento** - Logs detallados para debugging
6. **Seguridad** - Control granular de permisos y recursos

### 🎯 Casos de Uso Inmediatos:
- Limpieza automática de logs WebSocket (URGENTE)
- Sincronización periódica de Shelly (CRÍTICO)
- Verificación de actualizaciones Socket.io (ÚTIL)
- Backup automático de configuraciones (IMPORTANTE)

### 📋 Prioridad de Desarrollo:
**ALTA** - Debería ser uno de los próximos desarrollos después de completar las mejoras actuales del WebSocket Manager.

El Cron Manager se convertiría en un **plugin fundamental** del marketplace, ya que muchas funcionalidades requieren ejecución programada y actualmente no hay una solución unificada.

---

**Conclusión:** El Cron Manager no solo resolvería problemas actuales, sino que proporcionaría una base sólida para futuras funcionalidades que requieran automatización. 