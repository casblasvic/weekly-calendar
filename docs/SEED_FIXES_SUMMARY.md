# 🔧 CORRECCIONES APLICADAS A LOS ARCHIVOS DE SEED

## 📋 RESUMEN EJECUTIVO

Se identificaron y corrigieron **14 problemas críticos** en los archivos de seed relacionados con los campos `systemId` y `clinicId` que se añadieron recientemente a las tablas de prioridad media. Estas correcciones son esenciales para evitar errores al resetear la base de datos durante el desarrollo.

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **ServiceSetting y ProductSetting** ❌
- **Archivo**: `prisma/seed.ts`
- **Problema**: No incluían `systemId` en create/update
- **Impacto**: Error al crear servicios y productos

### 2. **BonoDefinitionSetting y PackageDefinitionSetting** ❌
- **Archivo**: `prisma/seed.ts`
- **Problema**: Settings de bonos y paquetes sin `systemId`
- **Impacto**: Error al crear bonos y paquetes

### 3. **PackageItem** ❌
- **Archivo**: `prisma/seed.ts`
- **Problema**: Items de paquetes sin `systemId`
- **Impacato**: Error al crear items de paquetes

### 4. **ScheduleTemplateBlock** ❌
- **Archivo**: `prisma/seed.ts`
- **Problema**: Bloques de plantilla sin `systemId`
- **Impacto**: Error al crear plantillas de horario

### 5. **PersonLeadData, PersonContactData, PersonClientData** ❌
- **Archivo**: `prisma/seed-persons.ts`
- **Problema**: Datos de personas sin `systemId`
- **Impacto**: Error al crear personas con roles funcionales

## ✅ CORRECCIONES APLICADAS

### 📁 **prisma/seed.ts**

#### ServiceSetting
```typescript
// ANTES ❌
await prisma.serviceSetting.upsert({
  where: { serviceId: service.id },
  update: {},
  create: { serviceId: service.id }
});

// DESPUÉS ✅
await prisma.serviceSetting.upsert({
  where: { serviceId: service.id },
  update: { systemId: system!.id },
  create: { serviceId: service.id, systemId: system!.id }
});
```

#### ProductSetting
```typescript
// ANTES ❌
create: { 
  productId: product.id, 
  currentStock: productData.currentStock,
  // ... otros campos
}

// DESPUÉS ✅
create: { 
  productId: product.id, 
  currentStock: productData.currentStock,
  systemId: system!.id,
  // ... otros campos
}
```

#### BonoDefinitionSetting
```typescript
// ANTES ❌
settings: { create: {} }

// DESPUÉS ✅
settings: { create: { systemId: system!.id } }
```

#### PackageDefinitionSetting y PackageItem
```typescript
// ANTES ❌
settings: { create: {} },
items: { create: [
  { itemType: 'SERVICE', serviceId: id, quantity: 1, price: 50 }
]}

// DESPUÉS ✅
settings: { create: { systemId: system!.id } },
items: { create: [
  { itemType: 'SERVICE', serviceId: id, quantity: 1, price: 50, systemId: system!.id }
]}
```

#### ScheduleTemplateBlock
```typescript
// ANTES ❌
blocks: { create: [
  { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', isWorking: true }
]}

// DESPUÉS ✅
blocks: { create: [
  { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', isWorking: true, systemId: system.id }
]}
```

### 📁 **prisma/seed-persons.ts**

#### PersonLeadData, PersonContactData, PersonClientData
```typescript
// ANTES ❌
await prisma.personLeadData.create({
  data: {
    functionalRole: { connect: { id: leadRole1.id } },
    status: 'QUALIFIED',
    source: 'WEB',
    interests: 'Tratamientos láser',
  }
});

// DESPUÉS ✅
await prisma.personLeadData.create({
  data: {
    functionalRoleId: leadRole1.id,
    status: 'QUALIFIED',
    source: 'WEB',
    interests: 'Tratamientos láser',
    systemId: systemId,
  }
});
```

## 🛠️ HERRAMIENTAS CREADAS

### 1. **prisma/seed-fixes.ts**
- Funciones helper para correcciones futuras
- Plantillas para crear registros con campos correctos
- Función para corregir datos existentes

### 2. **prisma/fix-seed-data.ts**
- Script ejecutable para corregir datos existentes
- Corrige automáticamente todos los registros sin `systemId`
- Manejo de errores y logging detallado

## 🚀 INSTRUCCIONES DE USO

### Para datos existentes (si ya tienes BD poblada):
```bash
npx tsx prisma/fix-seed-data.ts
```

### Para nuevos seeds:
```bash
npm run db:seed
```

Los nuevos seeds ya incluyen todas las correcciones.

## 📊 TABLAS AFECTADAS

| Tabla | Campo Añadido | Estado |
|-------|---------------|---------|
| `ServiceSetting` | `systemId` | ✅ Corregido |
| `ProductSetting` | `systemId` | ✅ Corregido |
| `BonoDefinitionSetting` | `systemId` | ✅ Corregido |
| `PackageDefinitionSetting` | `systemId` | ✅ Corregido |
| `PackageItem` | `systemId` | ✅ Corregido |
| `ScheduleTemplateBlock` | `systemId` | ✅ Corregido |
| `PersonLeadData` | `systemId` | ✅ Corregido |
| `PersonContactData` | `systemId` | ✅ Corregido |
| `PersonClientData` | `systemId` | ✅ Corregido |
| `ClinicSchedule` | `systemId` | ✅ Corregido |
| `ClinicScheduleBlock` | `systemId` | ✅ Corregido |
| `UserClinicSchedule` | `systemId` | ✅ Corregido |
| `UserClinicScheduleException` | `systemId` | ✅ Corregido |
| `CabinScheduleOverride` | `systemId` | ✅ Corregido |

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Backup**: Siempre haz backup antes de ejecutar correcciones
2. **Testing**: Verifica que los seeds funcionen después de resetear la BD
3. **Consistency**: Todos los nuevos registros deben incluir `systemId`
4. **Multi-tenant**: Los campos `clinicId` son opcionales pero recomendados para filtros

## 🔄 PROCESO DE VALIDACIÓN

1. ✅ Resetear la base de datos: `npm run db:reset`
2. ✅ Ejecutar seeds: `npm run db:seed`
3. ✅ Verificar que no hay errores
4. ✅ Comprobar que todos los registros tienen `systemId`

## 📝 NOTAS ADICIONALES

- Todos los IDs son CUIDs válidos generados por `@paralleldrive/cuid2`
- Las correcciones mantienen compatibilidad hacia atrás
- Los campos son opcionales en el schema para evitar breaking changes
- Se respeta la arquitectura multi-tenant del sistema

---

**Última actualización**: $(date)
**Autor**: Sistema de corrección automática
**Estado**: ✅ Completado y validado 