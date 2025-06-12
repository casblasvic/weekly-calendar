# Plan de Refactorización: Modelo Unificado de Personas

## ✅ Fase 1: Migración de Lead y ContactPerson (COMPLETADA)
**Objetivo**: Crear estructura base y migrar entidades sin datos existentes.

### Cambios realizados:
- Creado modelo `Person` con todos los campos necesarios
- Creado modelo `PersonFunctionalRole` para gestionar roles múltiples
- Creado modelos especializados: `PersonLeadData`, `PersonContactData`
- Creado modelo `Opportunity` para gestionar oportunidades de venta
- Implementado seed con datos de ejemplo
- Mantenido compatibilidad de nombres de campos

### Estado: COMPLETADO ✅

---

## 📋 Fase 2: Migración de Client
**Objetivo**: Migrar datos existentes de Client a Person manteniendo funcionalidad.

### Tareas principales:
1. **Análisis de dependencias**:
   - Mapear todas las relaciones de Client (appointments, tickets, invoices, etc.)
   - Identificar campos únicos de Client que no están en Person
   - Documentar lógica de negocio específica de Client

2. **Creación de modelo ClientData**:
   ```prisma
   model PersonClientData {
     id                String               @id @default(cuid())
     functionalRoleId  String               @unique
     tariffId          String?
     preferredClinicId String?
     marketingConsent  Boolean              @default(false)
     // ... otros campos específicos de cliente
   }
   ```

3. **Script de migración**:
   - Crear Person para cada Client existente
   - Crear PersonFunctionalRole con roleType = 'CLIENT'
   - Migrar relaciones (appointments, tickets, etc.) a Person
   - Mantener Client temporalmente para rollback

4. **Actualización de APIs**:
   - Crear capa de compatibilidad para endpoints existentes
   - Actualizar queries de Prisma gradualmente
   - Implementar validaciones de negocio

### Duración estimada: 2-3 semanas
### Riesgo: Alto (datos en producción)

---

## 📋 Fase 3: Decisión sobre User/Employee
**Objetivo**: Determinar estrategia para empleados y usuarios del sistema.

### Opciones a evaluar:

#### Opción A: Migrar User a Person (Unificación total)
- **Ventajas**: 
  - Modelo único para todas las personas
  - Facilita que empleados sean clientes
  - Simplifica relaciones
- **Desventajas**:
  - Mezcla autenticación con datos personales
  - Complejidad en permisos y seguridad
  - Dificulta módulos HR específicos

#### Opción B: Mantener User separado (Recomendado)
- **Ventajas**:
  - Separación clara autenticación/datos
  - Mejor para seguridad y permisos
  - Facilita módulos HR especializados
- **Desventajas**:
  - Posible duplicidad empleado-cliente
  - Requiere sincronización

### Tareas:
1. Análisis de impacto en módulos HR (nóminas, fichaje)
2. Evaluación de requisitos de seguridad
3. Decisión arquitectónica documentada
4. Si se elige A: Plan de migración detallado

### Duración estimada: 1 semana análisis + implementación variable
### Riesgo: Medio

---

## 📋 Fase 4: Actualización de UI y Lógica de Negocio
**Objetivo**: Adaptar frontend y backend al nuevo modelo.

### Tareas principales:

1. **Backend - Capa de servicios**:
   - Crear PersonService unificado
   - Implementar conversión de roles (lead → client)
   - Lógica de búsqueda y filtrado por rol
   - Validaciones de negocio

2. **Frontend - Componentes**:
   - Actualizar formularios de creación/edición
   - Implementar selector de roles
   - Adaptar vistas de listado con filtros
   - Migrar búsquedas y autocompletes

3. **Reportes y Analytics**:
   - Actualizar queries de reportes
   - Adaptar dashboards
   - Mantener compatibilidad histórica

### Componentes afectados:
- `/clients/*` - Gestión de clientes
- `/leads/*` - Gestión de leads
- `/contacts/*` - Gestión de contactos
- `/appointments/*` - Citas (relación con Person)
- `/tickets/*` - Ventas (relación con Person)
- `/reports/*` - Reportes

### Duración estimada: 3-4 semanas
### Riesgo: Medio

---

## 📋 Fase 5: Limpieza y Optimización
**Objetivo**: Eliminar código legacy y optimizar rendimiento.

### Tareas:

1. **Eliminación de modelos antiguos**:
   - Eliminar Client, Lead, ContactPerson (con backup)
   - Limpiar relaciones obsoletas
   - Actualizar esquema final

2. **Optimización de base de datos**:
   - Crear índices optimizados
   - Revisar queries N+1
   - Implementar caché donde corresponda

3. **Documentación**:
   - Actualizar documentación técnica
   - Crear guías de migración
   - Documentar nuevas APIs

### Duración estimada: 1-2 semanas
### Riesgo: Bajo

---

## 📋 Fase 6: Funcionalidades Avanzadas (Opcional)
**Objetivo**: Aprovechar el nuevo modelo para features avanzadas.

### Posibles mejoras:
1. **Historial de roles**: Tracking de cambios de rol en el tiempo
2. **Relaciones mejoradas**: Aprovechar EntityRelation para casos complejos
3. **Segmentación avanzada**: Filtros y reportes por múltiples roles
4. **API unificada**: Endpoint único para gestión de personas
5. **Importación/Exportación**: Herramientas mejoradas de migración

### Duración: Variable según features seleccionadas
### Riesgo: Bajo

---

## 🎯 Consideraciones Generales

### Principios a mantener:
1. **Compatibilidad**: Mantener APIs existentes funcionando
2. **Rollback**: Cada fase debe ser reversible
3. **Testing**: Cobertura exhaustiva de tests
4. **Performance**: No degradar rendimiento actual
5. **Datos**: Cero pérdida de información

### Estrategia de deployment:
1. Feature flags para activación gradual
2. Migración por lotes en producción
3. Monitoreo exhaustivo post-deployment
4. Plan de rollback documentado

### Métricas de éxito:
- ✅ Cero pérdida de datos
- ✅ Mantener o mejorar performance
- ✅ Reducción de código duplicado > 50%
- ✅ Facilitar nuevas funcionalidades
- ✅ Mejorar experiencia de usuario

### Timeline total estimado:
- Fase 2: 2-3 semanas
- Fase 3: 1-2 semanas
- Fase 4: 3-4 semanas
- Fase 5: 1-2 semanas
- **Total: 7-11 semanas** (sin Fase 6)
