# 🚀 Plan de Implementación - Sistema de Inicio de Servicios y Control de Dispositivos

## 📋 Resumen Ejecutivo

Este documento describe la implementación completa del sistema de **inicio de servicios** que permite:
- Control manual del inicio de servicios por parte del empleado
- Activación automática de dispositivos inteligentes (enchufes Shelly)
- Monitoreo en tiempo real del uso de equipos
- Registro detallado de uso de dispositivos por cita
- Validación posterior y creación de tickets

---

## 🔍 Estado Actual - Lo Que YA Tenemos

### ✅ **Estructura de Equipamiento**
- **Tabla `Equipment`**: Equipamiento físico (máquinas de depilación, etc.)
- **Tabla `Device`**: Dispositivos inteligentes (enchufes Shelly)
- **Relación 1:1**: Cada equipo puede tener un dispositivo asociado (`deviceId`)

### ✅ **Control de Dispositivos en Citas**
En la tabla `Appointment` ya tenemos campos para el control de dispositivos:
```sql
deviceActivationTimestamp   -- ✅ Cuándo se activó 
deviceDeactivationTimestamp -- ✅ Cuándo se desactivó
actualUsageMinutes          -- ✅ Tiempo real de uso
isUsageLocked              -- ✅ Si está bloqueado
estimatedDurationMinutes   -- ✅ Duración estimada
```

### ✅ **Requerimientos de Servicios**
- **`ServiceEquipmentRequirement`**: Qué equipos necesita cada servicio
- **`ServiceSkillRequirement`**: Qué habilidades necesita cada servicio

### ✅ **Validación y Extensiones**
- **`AppointmentService.validatedAt/validatedByUserId`**: Control de validación
- **`AppointmentExtension`**: Registro de extensiones de duración

---

## 📋 **FASES DE IMPLEMENTACIÓN**

---

## **FASE 1: Preparar Modelo de Datos** ⏱️ (1-2 días)

### **Objetivo**
Añadir campos y tablas necesarias para el control de inicio de servicios y uso de dispositivos.

### **1.1 Modificar `AppointmentService`**
Añadir campos para controlar cuándo el empleado inicia manualmente el servicio:

```sql
ALTER TABLE appointment_services 
ADD COLUMN serviceStartedAt TIMESTAMPTZ(6) NULL,
ADD COLUMN serviceStartedByUserId TEXT NULL;

CREATE INDEX appointment_services_serviceStartedAt_idx 
ON appointment_services(serviceStartedAt);

CREATE INDEX appointment_services_serviceStartedByUserId_idx 
ON appointment_services(serviceStartedByUserId);
```

### **1.2 Crear Tabla `AppointmentDeviceUsage`**
Tabla para registrar el uso específico de dispositivos por cita (equivalente a `shelly_dispositivos` pero integrada):

```sql
CREATE TABLE appointment_device_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  appointmentId TEXT NOT NULL,
  appointmentServiceId TEXT NULL,
  equipmentId TEXT NOT NULL,
  deviceId TEXT NOT NULL,
  startedAt TIMESTAMPTZ(6) NOT NULL,
  endedAt TIMESTAMPTZ(6) NULL,
  estimatedMinutes INT NOT NULL,
  actualMinutes INT NULL,
  energyConsumption FLOAT NULL,
  deviceData JSONB NULL,
  startedByUserId TEXT NOT NULL,
  systemId TEXT NOT NULL,
  createdAt TIMESTAMPTZ(6) DEFAULT NOW(),
  updatedAt TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX appointment_device_usage_appointmentId_idx 
  ON appointment_device_usage(appointmentId);
CREATE INDEX appointment_device_usage_startedAt_idx 
  ON appointment_device_usage(startedAt);
CREATE INDEX appointment_device_usage_deviceId_idx 
  ON appointment_device_usage(deviceId);
CREATE INDEX appointment_device_usage_equipmentId_idx 
  ON appointment_device_usage(equipmentId);
CREATE INDEX appointment_device_usage_systemId_idx 
  ON appointment_device_usage(systemId);
```

### **1.3 Actualizar Prisma Schema**
```prisma
model AppointmentService {
  // ... campos existentes ...
  serviceStartedAt       DateTime?                @db.Timestamptz(6)
  serviceStartedByUserId String?
  serviceStartedByUser   User?                    @relation("ServiceStartedBy", fields: [serviceStartedByUserId], references: [id])
  deviceUsage           AppointmentDeviceUsage[]

  @@index([serviceStartedAt])
  @@index([serviceStartedByUserId])
}

model AppointmentDeviceUsage {
  id                    String               @id @default(cuid())
  appointmentId         String
  appointmentServiceId  String?
  equipmentId           String
  deviceId              String
  startedAt             DateTime             @db.Timestamptz(6)
  endedAt               DateTime?            @db.Timestamptz(6)
  estimatedMinutes      Int
  actualMinutes         Int?
  energyConsumption     Float?
  deviceData            Json?
  startedByUserId       String
  systemId              String
  createdAt             DateTime             @default(now()) @db.Timestamptz(6)
  updatedAt             DateTime             @updatedAt @db.Timestamptz(6)
  
  appointment           Appointment          @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  appointmentService    AppointmentService?  @relation(fields: [appointmentServiceId], references: [id], onDelete: SetNull)
  equipment             Equipment            @relation(fields: [equipmentId], references: [id], onDelete: Cascade)
  device                Device               @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  startedByUser         User                 @relation("DeviceUsageStartedBy", fields: [startedByUserId], references: [id])
  system                System               @relation(fields: [systemId], references: [id], onDelete: Cascade)

  @@index([appointmentId])
  @@index([startedAt])
  @@index([deviceId])
  @@index([equipmentId])
  @@index([systemId])
  @@map("appointment_device_usage")
}

// Añadir en modelo User las nuevas relaciones
model User {
  // ... campos existentes ...
  servicesStarted       AppointmentService[] @relation("ServiceStartedBy")
  deviceUsageStarted    AppointmentDeviceUsage[] @relation("DeviceUsageStartedBy")
}

// Añadir en modelo Equipment la nueva relación
model Equipment {
  // ... campos existentes ...
  deviceUsage           AppointmentDeviceUsage[]
}

// Añadir en modelo Device la nueva relación
model Device {
  // ... campos existentes ...
  usageRecords          AppointmentDeviceUsage[]
}

// Añadir en modelo System la nueva relación
model System {
  // ... campos existentes ...
  appointmentDeviceUsage AppointmentDeviceUsage[]
}

// Añadir en modelo Appointment la nueva relación
model Appointment {
  // ... campos existentes ...
  deviceUsage           AppointmentDeviceUsage[]
}
```

### **1.4 Añadir Nuevo Estado de Servicio**
```prisma
enum AppointmentServiceStatus {
  SCHEDULED
  IN_PROGRESS  // 🆕 NUEVO: Servicio iniciado pero no validado
  VALIDATED
  NO_SHOW
  CANCELLED
}
```

---

## ✅ **FASE 2: API de Inicio de Servicio** ⏱️ **[COMPLETADA]**

### **Objetivo**
Crear endpoints y lógica de negocio para el inicio de servicios y control de dispositivos.

### **✅ 2.1 Endpoint Principal**
```typescript
// ✅ app/api/appointments/[id]/start-service/route.ts
POST /api/appointments/[appointmentId]/start-service
```

**✅ Implementado con:**
- ✅ Validación de autenticación con `getServerAuthSession()`
- ✅ Validación de parámetros con Zod
- ✅ Manejo correcto de `await params` (Next.js 15+)
- ✅ Integración con servicio de lógica de negocio

### **✅ 2.2 Servicio de Lógica de Negocio**
```typescript
// ✅ lib/services/appointment-service-starter.ts

✅ AppointmentServiceStarter.startService()
✅ DeviceController.activateDevice()
✅ DeviceController.deactivateDevice()
```

**✅ Características implementadas:**
- ✅ Validaciones completas de estado y permisos
- ✅ Manejo de flujos con/sin equipos
- ✅ Transacciones de base de datos
- ✅ Soporte para Shelly, Smart Plugs y dispositivos genéricos
- ✅ Manejo de timeouts con AbortController

### **✅ 2.3 Hook Personalizado para Frontend**
```typescript
// ✅ hooks/use-appointment-service-starter.ts

✅ useAppointmentServiceStarter()      // Hook básico
✅ useStartServiceWithToast()         // Con notificaciones
✅ useServiceStartFlow()              // Flujo completo con selección
```

### **✅ 2.4 Validaciones de Seguridad**
- ✅ Usuario pertenece al sistema de la cita
- ✅ Usuario tiene permisos para iniciar servicios
- ✅ Servicio pertenece a la cita
- ✅ Equipo está disponible en la clínica
- ✅ Control de disponibilidad de equipos
- ✅ Manejo de errores y estados

---

## **FASE 3: UI - Botón "Iniciar Servicio"** ⏱️ (2 días)

### **Objetivo**
Añadir interfaz para que el empleado pueda iniciar servicios desde el modal de citas.

### **3.1 Modificar `appointment-dialog.tsx`**
- ✅ Botón "Iniciar Servicio" por cada servicio
- ✅ Estado visual cuando servicio está iniciado
- ✅ Modal de selección de equipos (si hay múltiples)
- ✅ Indicadores de progreso
- ✅ Manejo de errores

### **3.2 Componente `EquipmentSelectorModal`**
Modal para seleccionar equipo cuando hay múltiples opciones disponibles.

### **3.3 Estados Visuales**
```typescript
interface ServiceUIState {
  NOT_STARTED: "Iniciar Servicio" // Botón azul
  IN_PROGRESS: "En Progreso"      // Badge verde con ícono
  COMPLETED: "Completado"         // Badge gris
  ERROR: "Error al iniciar"       // Badge rojo
}
```

---

## **FASE 4: Monitoreo de Dispositivos** ⏱️ (3-4 días - OPCIONAL)

### **Objetivo**
Sistema de monitoreo en tiempo real para actualizar datos de uso de dispositivos.

### **4.1 Servicio de Background**
```typescript
// lib/services/device-monitor.ts
class DeviceMonitor {
  startMonitoring(deviceUsageId: string): void
  stopMonitoring(deviceUsageId: string): void
  updateDeviceUsage(deviceUsageId: string): Promise<void>
}
```

### **4.2 API de Webhooks**
```typescript
// app/api/devices/webhook/route.ts
POST /api/devices/webhook
```

Para recibir actualizaciones automáticas de los dispositivos Shelly.

### **4.3 Dashboard de Monitoreo**
Página para ver dispositivos activos en tiempo real (opcional).

---

## **FASE 5: Validación y Finalización** ⏱️ (1-2 días)

### **Objetivo**
Integrar el sistema con la validación existente y creación de tickets.

### **5.1 Modificar Endpoint de Validación**
```typescript
// app/api/appointments/validate/route.ts
```
- ✅ Al validar servicios, finalizar uso de dispositivos automáticamente
- ✅ Calcular tiempo real de uso
- ✅ Actualizar `deviceDeactivationTimestamp` en appointment
- ✅ Crear ticket con datos reales de uso

### **5.2 Reportes de Uso**
- ✅ Tiempo estimado vs. real por servicio
- ✅ Eficiencia de uso de equipos
- ✅ Consumo energético por tratamiento

---

## 🚨 **Casos Edge y Consideraciones**

### **Manejo de Errores**
1. **Dispositivo offline**: Permitir inicio manual + notificación
2. **Múltiples equipos**: Modal de selección obligatorio
3. **Sin dispositivo**: Solo marcar inicio, sin control automático
4. **Usuario olvida iniciar**: Alerta al validar + opción de marcar retroactivamente

### **Reglas de Negocio**
1. **Un equipo = una cita**: No puede usarse simultáneamente
2. **Servicios secuenciales**: Permitir múltiples servicios en paralelo
3. **Tiempo límite**: Alerta si excede tiempo estimado significativamente
4. **Emergencias**: Botón de "parada de emergencia" para todos los dispositivos

### **Seguridad**
1. **Autenticación**: Solo usuarios autorizados
2. **Autorización**: Verificar permisos por clínica
3. **Auditoría**: Log completo de todas las acciones
4. **Validación**: Verificar integridad de datos

---

## 🎯 **Objetivos de Rendimiento**

- **Inicio de servicio**: < 2 segundos
- **Activación de dispositivo**: < 5 segundos  
- **Actualización de datos**: Cada 30 segundos
- **Respuesta de API**: < 500ms

---

## 📊 **Métricas de Éxito**

1. **Adopción**: % de servicios iniciados manualmente vs. total
2. **Precisión**: Diferencia entre tiempo estimado y real
3. **Eficiencia**: Tiempo de respuesta de activación de dispositivos
4. **Confiabilidad**: % de dispositivos que responden correctamente

---

## 🔄 **Plan de Rollback**

En caso de problemas:
1. **Deshabilitar botones** de inicio de servicio en UI
2. **Mantener flujo actual** de validación
3. **Migración reversa** si es necesario (poco probable)
4. **Logs detallados** para debug

---

**Fecha de creación**: 25 de Diciembre, 2024  
**Última actualización**: 25 de Diciembre, 2024  
**Estado**: ✅ **Fase 1 y 2 COMPLETADAS** - Lista para Fase 3 (UI) 