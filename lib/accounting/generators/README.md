# Sistema de Plantillas Contables Expandidas

## Descripción General

Este sistema permite generar configuraciones completas para la importación inicial de datos contables, incluyendo:
- Categorías de servicios
- Familias de productos
- Series de documentos
- Métodos de pago

## Arquitectura

### 1. Generadores Modulares

#### `category-generator.ts`
Genera categorías de servicios y familias de productos basadas en:
- Tipo de negocio (clínica estética, centro de belleza, spa, etc.)
- Características del negocio seleccionadas

**Categorías generadas:**
- Consultas (CONSULTAS)
- Consultas médicas (CONSULTAS_MED)
- Tratamientos médicos (TRAT_MED)
- Medicina estética (MED_EST)
- Tratamientos faciales (TRAT_FACIAL)
- Tratamientos corporales (TRAT_CORPORAL)
- Depilación (DEPILACION)
- Manicura/Pedicura (MANICURA)
- Corte de pelo (CORTE_PELO)
- Coloración (COLOR_PELO)
- Masajes (MASAJES)
- Circuitos spa (CIRCUITOS)

**Familias de productos:**
- Cosmética facial (COSM_FACIAL)
- Cosmética corporal (COSM_CORPORAL)
- Productos capilares (PROD_CAPILAR)
- Aparatología (APARATOLOGIA)
- Material sanitario (MAT_SANITARIO)
- Otros productos (OTROS_PROD)

#### `series-generator.ts`
Genera series de documentos con soporte multi-centro:
- Series base: TICKET, FACTURA, ABONO
- Series especiales: PRESUPUESTO (QUOTE), BONO (VOUCHER)
- Prefijos únicos por centro usando códigos de 3 letras

**Funciones principales:**
- `generateDocumentSeries()`: Genera series base
- `generateCenterDocumentSeries()`: Genera series específicas por centro
- `generateCenterCode()`: Genera código de 3 letras del nombre del centro

#### `payment-generator.ts`
Genera métodos de pago según:
- País (ES, FR, otros)
- Características del negocio
- Siempre incluye métodos base para completitud contable

**Métodos de pago:**
- Efectivo (CASH)
- Tarjeta (CARD)
- Transferencia (TRANSFER)
- Cheque (CHECK) - Solo FR
- Domiciliación (DIRECT_DEBIT) - Solo ES/FR
- Financiación (FINANCING) - Si tratamientos médicos
- Bonos regalo (GIFT_CARD) - Si venta productos

#### `template-configurator.ts`
Orquestador principal que:
- Coordina todos los generadores
- Valida configuración
- Genera resumen de configuración
- Proporciona mapeos contables recomendados

### 2. Tipos (`types.ts`)

Define las interfaces principales:
- `BusinessFeatures`: Características del negocio
- `ServiceCategory`: Categorías de servicios
- `ProductFamily`: Familias de productos
- `DocumentSeriesTemplate`: Plantillas de series
- `PaymentMethodTemplate`: Plantillas de métodos de pago
- `ExtendedAccountingTemplate`: Plantilla completa

## Uso

### 1. En el Frontend

```typescript
// En AccountingTemplateImporter.tsx
const businessFeatures = {
  hasConsultationServices: true,
  hasMedicalTreatments: false,
  hasHairSalon: true,
  hasSpa: false,
  sellsProducts: true,
  isMultiCenter: true
};

// Enviar al backend
await fetch('/api/chart-of-accounts/import-template', {
  method: 'POST',
  body: JSON.stringify({
    templateCode,
    country,
    sector,
    businessFeatures,
    // ... otros campos
  })
});
```

### 2. En el Backend

```typescript
// En import-template/route.ts
const extendedTemplate = generateExtendedTemplate({
  businessType: sector,
  features: businessFeatures,
  systemConfig: {
    currentYear: new Date().getFullYear(),
    countryCode,
    currency
  },
  baseTemplate: template
});

// Crear registros en base de datos
// - Categorías de servicios
// - Series de documentos
// - Métodos de pago
```

## Características Clave

### 1. Multi-Centro
- Flag `isMultiCenter` simplificado
- Series de documentos se generan dinámicamente cuando se crean centros
- Códigos de centro de 3 letras basados en nombres

### 2. Flexibilidad
- Categorías y familias genéricas, no servicios específicos
- Usuarios añaden sus propios servicios/productos después
- Métodos de pago siempre incluidos para completitud contable

### 3. Internacionalización
- Soporte para ES, FR, EN
- Nombres y descripciones multi-idioma
- Configuración específica por país

## Próximos Pasos

1. **Modelos de Prisma**: Crear modelos para ServiceCategory y ProductFamily
2. **Series de documentos**: Verificar modelo correcto en Prisma
3. **Mapeos contables**: Implementar creación automática de mapeos
4. **Generación dinámica**: Hook para crear series cuando se añaden centros
5. **Validación**: Añadir más validaciones de negocio
6. **Tests**: Crear tests unitarios para cada generador

## Notas de Implementación

- Los métodos de pago se crean a nivel sistema (global)
- Las categorías/familias se pueden crear por entidad legal
- Las series de documentos son por entidad legal
- Compatible con el modelo de herencia global/clínica existente
