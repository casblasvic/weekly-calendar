# 📋 Plan de Implementación - Sistema de Resize y Control de Equipos

## 🎯 Objetivo Principal
Implementar un sistema completo de gestión de duración de citas con:
- Duración estimada vs. real
- Control de equipos con tiempo limitado
- Auditoría de ampliaciones
- UI que refleje estos cambios

---

## ✅ FASE 0: Arreglo Inmediato del Modal (HOT FIX)

### Objetivo
El modal de edición debe mostrar las horas reales de la cita (tras resize), no recalcular desde servicios.

### Tareas
- [x] **0.1** Modificar `appointment-dialog.tsx` para usar datos reales en modo edición ✅
- [ ] **0.2** Verificar que funciona correctamente tras resize
- [ ] **0.3** Comprobar que no rompe el modo creación

### Archivos a modificar
- `/components/appointment-dialog.tsx`

### Test de verificación
1. Crear una cita de 12:33 a 13:33
2. Hacer resize hasta 14:18
3. Click en editar → Modal debe mostrar 14:18 (no 13:33)

---

## 📊 FASE 1: Preparar Modelo de Datos

### Objetivo
Añadir campos y tablas necesarias sin romper funcionalidad existente.

### Pre-requisitos
- [ ] Backup de base de datos
- [ ] Documentar campos actuales de `appointments` y `appointment_services`

### Tareas
- [ ] **1.1** Auditar campos actuales y documentar
- [ ] **1.2** Crear migración para campos en `appointments`
- [ ] **1.3** Crear tabla `appointment_equipment_usage`
- [ ] **1.4** Crear tabla `appointment_extensions`
- [ ] **1.5** Actualizar Prisma Schema
- [ ] **1.6** Ejecutar migración y verificar

### Campos a añadir en `appointments`
```sql
- estimated_duration_minutes INTEGER
- actual_duration_minutes INTEGER (computed)
- is_extended BOOLEAN DEFAULT FALSE
- extension_reason TEXT
```

### Nueva tabla `appointment_equipment_usage`
```sql
- id, appointment_id, appointment_service_id, equipment_id
- started_at, ended_at
- scheduled_minutes, actual_minutes
- is_active, extended_minutes, extended_reason
- created_at, updated_at
```

### Nueva tabla `appointment_extensions`
```sql
- id, appointment_id, extended_by_user_id
- previous_end_time, new_end_time
- extension_minutes, reason
- equipment_extended
- created_at
```

---

## 💾 FASE 2: Poblar Datos Iniciales

### Objetivo
Llenar datos en citas existentes sin afectar funcionamiento.

### Tareas
- [ ] **2.1** Script para llenar `estimated_duration_minutes` en citas existentes
- [ ] **2.2** Llenar `estimatedDuration` en `appointment_services` donde sea NULL
- [ ] **2.3** Marcar citas extendidas (donde actual > estimated)
- [ ] **2.4** Verificar integridad de datos

---

## 🔄 FASE 3: Actualizar Lógica de Negocio

### Objetivo
Modificar APIs para usar nuevos campos manteniendo compatibilidad.

### Tareas
- [ ] **3.1** POST /appointments - Calcular y guardar duración estimada
- [ ] **3.2** PUT /appointments - Detectar extensiones y crear logs
- [ ] **3.3** POST /appointments/:id/equipment/start - Nuevo endpoint
- [ ] **3.4** GET /appointments - Incluir nuevos campos en respuesta

---

## 🖼️ FASE 4: Actualizar UI

### Objetivo
Mostrar información de duración estimada/real y extensiones.

### Tareas
- [ ] **4.1** Modal - Mostrar duración estimada vs real en edición
- [ ] **4.2** Appointment item - Badge visual si está extendida
- [ ] **4.3** Tooltip - Mostrar detalles de extensión
- [ ] **4.4** Botón "Iniciar Servicio" (versión básica)

---

## 🧹 FASE 5: Limpieza y Optimización

### Objetivo
Eliminar código/campos obsoletos y documentar.

### Tareas
- [ ] **5.1** Identificar campos no usados
- [ ] **5.2** Buscar archivos .bak/.backup
- [ ] **5.3** Crear migración de limpieza
- [ ] **5.4** Actualizar documentación

---

## 🚨 Reglas de Seguridad

1. **NUNCA** modificar estructura de tablas existentes sin backup
2. **SIEMPRE** usar `IF NOT EXISTS` en creación de tablas
3. **NO** borrar campos hasta verificar 100% que no se usan
4. **SIEMPRE** mantener compatibilidad hacia atrás
5. **TESTEAR** cada fase antes de continuar

---

## 📝 Notas de Progreso

### FASE 0 - Iniciada: 18/06/2024 22:40
- [x] Tarea 0.1 completada - Modal ahora usa horas reales de BD en modo edición
- Añadidos campos startTime/endTime a interfaz existingAppointment
- Lógica: Si existe endTime en BD → usar real, sino → calcular desde servicios
- **PENDIENTE:** Verificar con prueba real antes de continuar
