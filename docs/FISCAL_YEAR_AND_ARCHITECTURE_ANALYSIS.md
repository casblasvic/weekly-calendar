# Análisis Arquitectónico: Ejercicios Fiscales y Actividad Multi-Centro

## 🎯 **Resumen Ejecutivo**

Este documento analiza las preguntas críticas sobre la gestión contable en un entorno multi-clínica y las mejoras necesarias para soportar diferentes tipos de actividad económica.

---

## 📊 **1. Gestión de Ejercicios Fiscales**

### **✅ Estado Actual - Validaciones Existentes**

La API `/api/fiscal-years` ya implementa validaciones correctas:

```typescript
// ✅ Validación de solapamiento (lines 89-109)
const overlapping = await prisma.fiscalYear.findFirst({
  where: {
    legalEntityId,
    OR: [
      { AND: [{ startDate: { lte: start } }, { endDate: { gte: start } }] },
      { AND: [{ startDate: { lte: end } }, { endDate: { gte: end } }] },
      { AND: [{ startDate: { gte: start } }, { endDate: { lte: end } }] }
    ]
  }
});

// ✅ Constraint en BD: @@unique([legalEntityId, name])
```

### **🚨 Problema Identificado**

El componente `AccountingTemplateImporter` **SIEMPRE** intentaba crear un ejercicio fiscal, ignorando si ya existía uno para el período.

### **✅ Solución Implementada**

Ahora el flujo es:
1. **Verificar** ejercicios fiscales existentes
2. **Buscar** si alguno incluye el período deseado
3. **Usar existente** o crear nuevo según corresponda
4. **Informar** al usuario qué acción se tomó

---

## 🏥 **2. Múltiples Clínicas en una Entidad Legal**

### **Estructura Actual**

```
LegalEntity (Sociedad Fiscal)
├── FiscalYear (único por entidad, períodos no solapados)
├── DocumentSeries[] (por ejercicio fiscal)
└── Clinic[] (múltiples clínicas)
    ├── tariffId (cada clínica tiene UNA tarifa)
    ├── ClinicPaymentSetting[] (configuración específica)
    └── ClinicSchedule (horarios específicos)
```

### **❓ Preguntas Contables Respondidas**

#### **¿Series contables por clínica?**
- **Actual**: `DocumentSeries` están a nivel de `FiscalYear`
- **Diferenciación**: Se puede usar prefijos o códigos por clínica
- **Ejemplo**: `CLI001-FAC-00001`, `CLI002-FAC-00001`

#### **¿Un ejercicio fiscal por entidad?**
- **✅ Correcto**: Un `FiscalYear` por `LegalEntity`
- **Razón**: La contabilidad y declaraciones fiscales se hacen por entidad legal
- **Clínicas**: Son centros de coste/beneficio dentro de la entidad

#### **¿Diferentes tarifas por clínica?**
- **✅ Soportado**: `Clinic.tariffId` permite tarifas diferentes
- **Beneficio**: Precios diferentes según ubicación/mercado
- **Contabilidad**: Todos los ingresos se consolidan en la entidad legal

---

## 🛒 **3. Actividad Sin Centros Físicos**

### **Casos de Uso Identificados**

1. **E-commerce**: Venta online sin ubicación física
2. **Dispositivos médicos**: Venta directa de equipamiento
3. **Consultoría**: Servicios sin agenda física
4. **Oficina corporativa**: Actividad administrativa

### **🚧 Limitaciones Actuales**

El modelo actual **requiere** que toda actividad esté asociada a una `Clinic`:

```typescript
// Estructura actual
Ticket → Clinic (obligatorio)
Service → se vende via tariff de Clinic
Product → se vende via tariff de Clinic
```

### **💡 Propuesta de Solución**

#### **Opción A: Clínicas Virtuales** (Recomendada)

Extender el modelo `Clinic` con nuevos campos:

```typescript
model Clinic {
  // ... campos existentes
  clinicType: ClinicType @default(PHYSICAL)
  hasAppointmentSystem: Boolean @default(true)
  isVirtual: Boolean @default(false)
}

enum ClinicType {
  PHYSICAL        // Clínica física con agenda
  VIRTUAL         // Consultas online
  ECOMMERCE       // Ventas online
  OFFICE          // Oficina administrativa
  WAREHOUSE       // Almacén/distribución
}
```

#### **Opción B: Actividad Directa de Entidad**

Permitir que `LegalEntity` tenga actividad directa:

```typescript
// Nuevas relaciones opcionales
Ticket.legalEntityId?: String  // Para actividad directa
Ticket.clinicId?: String       // Para actividad de clínica
```

### **📊 Comparación de Opciones**

| Aspecto | Opción A (Clínicas Virtuales) | Opción B (Actividad Directa) |
|---------|-------------------------------|------------------------------|
| **Complejidad** | Baja | Alta |
| **Consistencia** | Mantiene lógica actual | Requiere refactoring |
| **Escalabilidad** | Excelente | Buena |
| **Migración** | Sin breaking changes | Breaking changes |
| **UX** | Simple (desactivar agenda) | Complejo (dos flujos) |

---

## 📚 **4. Preguntas Contables Fundamentales**

### **¿Pueden cambiar los planes contables entre ejercicios?**

**✅ SÍ**, es práctica común:
- **Entre ejercicios**: Se pueden modificar/actualizar
- **Durante ejercicio**: Peligroso - afecta asientos existentes
- **Recomendación**: Cambios al inicio de ejercicio

### **¿Qué pasa si se modifica el plan después de crear asientos?**

**⚠️ Problemas potenciales**:
- **Inconsistencia**: Asientos apuntan a cuentas modificadas
- **Auditoría**: Dificulta el seguimiento
- **Regulatorio**: Puede incumplir normativas

**✅ Mejores prácticas**:
- **No modificar** cuentas con movimientos
- **Crear nuevas** cuentas si es necesario
- **Hacer cambios** al cierre/inicio de ejercicio

### **¿Plan contable único o por ejercicio?**

**📊 Modelo recomendado**:
- **Plan base**: Estable entre ejercicios
- **Ajustes**: Nuevas cuentas si es necesario
- **Versioning**: Mantener historial de cambios

---

## 🔧 **5. Implementaciones Requeridas**

### **Corto Plazo (CRÍTICO)**
- [x] ✅ Corregir error 404 en import-template
- [x] ✅ Validar ejercicios fiscales existentes antes de crear
- [ ] 🔄 Añadir spinner y mensajes informativos en importación

### **Medio Plazo (IMPORTANTE)**
- [ ] 📋 Implementar `ClinicType` y `hasAppointmentSystem`
- [ ] 🎨 UI para desactivar agenda en clínicas virtuales
- [ ] 📊 Dashboard diferenciado por tipo de clínica

### **Largo Plazo (ESTRATÉGICO)**
- [ ] 🔄 Sistema de versioning para planes contables
- [ ] 📈 Reportes consolidados multi-clínica
- [ ] 🌐 Soporte completo para e-commerce integrado

---

## 🧪 **6. Casos de Prueba**

### **Ejercicios Fiscales**
1. ✅ Crear primer ejercicio → Debe funcionar
2. ✅ Crear ejercicio solapado → Debe fallar
3. ✅ Importar plan en ejercicio existente → Debe usar existente
4. ✅ Importar plan sin ejercicio → Debe crear nuevo

### **Múltiples Clínicas**
1. 📋 Entidad con 3 clínicas, tarifas diferentes
2. 📋 Ventas en cada clínica → Consolidación correcta
3. 📋 Series documentales diferenciadas

### **Actividad Virtual**
1. 📋 Clínica e-commerce sin agenda
2. 📋 Venta productos sin cita previa
3. 📋 Servicios de consultoría online

---

## 📋 **7. Conclusiones y Recomendaciones**

### **✅ Fortalezas del Sistema Actual**
- Validaciones de ejercicios fiscales robustas
- Arquitectura multi-clínica funcional
- Separación clara entre entidad legal y centros operativos

### **🚧 Áreas de Mejora Identificadas**
- Flexibilidad para actividad sin centros físicos
- UX en importación de planes contables
- Diferenciación visual entre tipos de actividad

### **🎯 Recomendación Principal**

**Implementar Opción A (Clínicas Virtuales)**:
1. **Mínimo impacto** en código existente
2. **Máxima flexibilidad** para casos de uso futuros
3. **Escalabilidad** para growth del negocio
4. **Consistencia** con arquitectura actual

---

*Documento actualizado: Enero 2025*
*Revisión siguiente: Tras implementación de cambios críticos* 