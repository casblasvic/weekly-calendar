# Plan de Integración: Métodos de Pago con Herencia Global/Clínica

## 📋 Contexto Actual

### Sistema de Métodos de Pago Existente
- **PaymentMethodDefinition**: Define métodos de pago a nivel sistema
- **ClinicPaymentSetting**: Activa/desactiva métodos por clínica
- **Herencia**: Los métodos globales están disponibles para todas las clínicas

### Corrección Reciente (Memory 9ccb25ad)
- Se simplificó la lógica para mostrar TODOS los métodos de pago activos del sistema
- Los métodos de pago deben estar disponibles contablemente aunque no se usen en clínicas

## 🎯 Objetivo de Integración

### 1. Durante la Importación de Plantilla Contable
```typescript
// Al importar plantilla con características del negocio:
if (businessFeatures && legalEntityId) {
  // 1. Generar métodos de pago según configuración
  const generatedPaymentMethods = generatePaymentMethods(
    businessType, 
    features, 
    paymentConfig
  );
  
  // 2. Crear PaymentMethodDefinition para cada método generado
  for (const method of generatedPaymentMethods) {
    await prisma.paymentMethodDefinition.create({
      data: {
        systemId,
        name: method.name.es, // O según idioma del sistema
        code: method.code,
        type: method.type,
        isActive: true
      }
    });
  }
  
  // 3. Crear mapeos contables automáticos
  const accountMappings = generatePaymentAccountMappings(generatedPaymentMethods);
  // ... crear PaymentMethodAccountMapping
}
```

### 2. Configuración por Clínica
```typescript
// Los métodos generados están disponibles globalmente
// Cada clínica puede:
// - Activar/desactivar métodos específicos
// - Configurar terminal POS para métodos de tarjeta
// - Establecer cuentas bancarias para transferencias

// Ejemplo de activación selectiva:
if (features.hasMedicalTreatments) {
  // Auto-activar financiación en clínicas médicas
  await prisma.clinicPaymentSetting.create({
    data: {
      systemId,
      clinicId,
      paymentMethodDefinitionId: financingMethodId,
      isActiveInClinic: true
    }
  });
}
```

## 🔄 Flujo de Herencia

### Nivel 1: Sistema (Global)
- **Generación automática** durante importación de plantilla
- **Métodos base**: Efectivo, Tarjeta, Transferencia (siempre activos)
- **Métodos opcionales**: Según características del negocio

### Nivel 2: Clínica (Específico)
- **Hereda todos** los métodos del sistema
- **Puede activar/desactivar** según necesidades
- **Configuración adicional**: Terminales POS, cuentas bancarias

### Visualización en UI
```typescript
// En mapeo contable (unmapped-items)
// Se muestran TODOS los métodos activos del sistema
const paymentMethods = await prisma.paymentMethodDefinition.findMany({
  where: {
    systemId,
    isActive: true
  }
});

// En configuración de clínica
// Se muestran con estado de activación
const clinicPaymentMethods = await prisma.paymentMethodDefinition.findMany({
  where: { systemId, isActive: true },
  include: {
    clinicSettings: {
      where: { clinicId }
    }
  }
});
```

## 💡 Consideraciones Especiales

### 1. Métodos de Pago Especiales
- **Financiación**: Auto-activar en centros médicos
- **Bonos Regalo**: Activar si venden productos
- **Domiciliación**: Requiere configuración bancaria adicional

### 2. Multi-ubicación
- Los métodos de pago son **globales al sistema**
- Las series de documentos son **específicas por ubicación**
- Cada clínica/ubicación activa sus propios métodos

### 3. Compatibilidad Retroactiva
- Respetar métodos de pago existentes
- No duplicar si ya existen (verificar por código)
- Mantener mapeos contables actuales

## 📐 Arquitectura Propuesta

```
Sistema
├── PaymentMethodDefinition (Global)
│   ├── CASH (Siempre activo)
│   ├── CARD (Siempre activo)
│   ├── TRANSFER (Siempre activo)
│   ├── FINANCING (Si tiene tratamientos médicos)
│   ├── GIFT_CARD (Si vende productos)
│   └── ... otros según configuración
│
└── Clínicas
    ├── Clínica Madrid
    │   ├── ClinicPaymentSetting
    │   │   ├── CASH ✓
    │   │   ├── CARD ✓ (Terminal: TPV-001)
    │   │   └── FINANCING ✓
    │   │
    │   └── Series: TICK-MAD-2025, FACT-MAD-2025
    │
    └── Clínica Barcelona
        ├── ClinicPaymentSetting
        │   ├── CASH ✓
        │   ├── CARD ✓ (Terminal: TPV-002)
        │   └── TRANSFER ✓
        │
        └── Series: TICK-BCN-2025, FACT-BCN-2025
```

## ✅ Beneficios

1. **Configuración inicial completa** con un solo proceso
2. **Flexibilidad** para personalizar por clínica
3. **Mapeos contables automáticos** desde el inicio
4. **Coherencia** con el modelo de herencia existente
5. **Escalabilidad** para nuevas ubicaciones
