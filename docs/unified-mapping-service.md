# Servicio Unificado de Mapeo Contable

## Descripción General

El **Servicio Unificado de Mapeo Contable** es una solución centralizada para gestionar automáticamente las asignaciones contables de servicios, productos y métodos de pago en un sistema SaaS multi-clínica. Este servicio reemplaza implementaciones fragmentadas con una arquitectura consistente y mantenible.

## Características Principales

### 1. Estructura Jerárquica de Subcuentas

El sistema genera códigos de subcuenta siguiendo una estructura jerárquica que permite:

- **Servicios**: `{cuenta_base}.{clínica}.{categoría}.{servicio}`
  - Ejemplo: `705.CCM.DER.BOT` (Servicio Botox en Clínica Centro Madrid, categoría Dermatología)

- **Productos de Venta**: `{cuenta_base}.{clínica}.{categoría}.{producto}.V`
  - Ejemplo: `700.CCM.COS.CRE.V` (Venta de Crema en Clínica Centro Madrid)

- **Productos de Consumo**: `{cuenta_base}.{clínica}.{categoría}.{producto}.C`
  - Ejemplo: `600.CCM.MAT.AGU.C` (Consumo de Agujas en Clínica Centro Madrid)

- **Métodos de Pago**: `{cuenta_base}.{clínica}.{método}`
  - Ejemplo: `570.CCM.EFE` (Efectivo en Clínica Centro Madrid)

### 2. Generación Automática de Códigos

- **Códigos de Clínica**: Se generan automáticamente a partir del nombre
  - Una palabra: primeras 4 letras (ej: "Centro" → "CENT")
  - Dos palabras: primeras 2 letras de cada una (ej: "Centro Médico" → "CEME")
  - Más palabras: primera letra de cada una, máximo 4 (ej: "Clínica Centro Madrid" → "CCM")

- **Códigos de Categoría/Servicio/Producto**: Primeras 3 letras del nombre

### 3. Gestión Multi-Clínica

- Mapeos específicos por clínica cuando existen múltiples centros
- Mapeos globales cuando solo hay una clínica
- Separación contable completa entre clínicas

### 4. Control de Remapeo

- `forceRemap: true`: Elimina mapeos existentes antes de crear nuevos
- `forceRemap: false`: Mantiene mapeos existentes, solo crea los faltantes

## API del Servicio

### UnifiedMappingService

```typescript
class UnifiedMappingService {
  // Mapear servicios
  static async mapServices(
    services: Service[],
    chartOfAccounts: ChartOfAccountEntry[],
    countryCode: string,
    options: MappingOptions,
    db?: PrismaClient | PrismaTransaction
  ): Promise<MappingResult>

  // Mapear productos
  static async mapProducts(
    products: Product[],
    chartOfAccounts: ChartOfAccountEntry[],
    countryCode: string,
    options: MappingOptions,
    db?: PrismaClient | PrismaTransaction
  ): Promise<MappingResult>

  // Mapear métodos de pago
  static async mapPaymentMethods(
    paymentMethods: PaymentMethodDefinition[],
    chartOfAccounts: ChartOfAccountEntry[],
    countryCode: string,
    options: MappingOptions,
    db?: PrismaClient | PrismaTransaction
  ): Promise<MappingResult>
}
```

### Interfaces

```typescript
interface MappingOptions {
  legalEntityId: string;
  systemId: string;
  clinicId?: string;
  forceRemap?: boolean;
}

interface MappingResult {
  mapped: number;
  errors: number;
  details: MappingDetail[];
}

interface MappingDetail {
  id: string;
  name: string;
  account?: string;
  error?: string;
}
```

## Uso

### Desde el API Endpoint

```typescript
// En /api/accounting/auto-map-all/route.ts
await UnifiedMappingService.mapServices(
  services,
  chartOfAccounts,
  countryCode,
  {
    legalEntityId,
    systemId,
    clinicId: selectedClinicId,
    forceRemap: true
  }
);
```

### Desde Quick Setup

```typescript
// En quick-setup-actions.ts
await UnifiedMappingService.mapProducts(
  products,
  chartOfAccountEntries,
  countryCode,
  {
    legalEntityId: legalEntity.id,
    systemId: legalEntity.systemId,
    forceRemap: true
  },
  tx // Transacción de Prisma
);
```

## Flujo de Trabajo

1. **Obtención de Datos**: Se recuperan los elementos a mapear (servicios, productos, métodos de pago)
2. **Determinación de Clínicas**: Se identifica si hay múltiples clínicas o una sola
3. **Generación de Códigos**: Se crean códigos únicos para clínica, categoría e item
4. **Búsqueda de Cuenta Base**: Se encuentra la cuenta contable apropiada según el tipo
5. **Creación de Subcuenta**: Se genera o recupera la subcuenta con el código jerárquico
6. **Registro de Mapeo**: Se guarda la relación entre el elemento y la subcuenta

## Beneficios

1. **Trazabilidad Completa**: Cada transacción identifica la clínica y categoría específica
2. **Informes Detallados**: Análisis de rentabilidad por clínica y categoría
3. **Mantenimiento Centralizado**: Un único punto de control para toda la lógica de mapeo
4. **Escalabilidad**: Fácil adición de nuevas clínicas, servicios o productos
5. **Consistencia**: Garantiza uniformidad en todos los mapeos del sistema

## Extensiones Futuras

El servicio está preparado para incorporar:

- Mapeo de tipos de IVA
- Mapeo de tipos de descuento
- Mapeo de tipos de gastos
- Mapeo de sesiones de caja
- Dimensiones analíticas adicionales

## Notas de Implementación

- Utiliza transacciones de Prisma para garantizar atomicidad
- Maneja errores individualmente sin detener el proceso completo
- Proporciona retroalimentación detallada de cada operación
- Compatible con el sistema de permisos existente
