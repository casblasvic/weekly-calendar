# Sistema Contable Multidimensional - Documentación Completa

## Índice
1. [Arquitectura General del Sistema](#1-arquitectura-general-del-sistema)
2. [Estructura de Cuentas y Subcuentas](#2-estructura-de-cuentas-y-subcuentas)
3. [Lógica de Mapeo por Tipo de Operación](#3-lógica-de-mapeo-por-tipo-de-operación)
4. [Generación Automática de Subcuentas](#4-generación-automática-de-subcuentas)
5. [Flujos Contables por Tipo de Transacción](#5-flujos-contables-por-tipo-de-transacción)
6. [Dimensiones Analíticas](#6-dimensiones-analíticas)
7. [Configuración por País](#7-configuración-por-país)
8. [Implementación Técnica](#8-implementación-técnica)
9. [Mejores Prácticas y Extensibilidad](#9-mejores-prácticas-y-extensibilidad)

## 1. Arquitectura General del Sistema

### 1.1 Principios Fundamentales

1. **Contabilidad Multidimensional**: Cada transacción puede analizarse desde múltiples perspectivas simultáneamente
2. **Mapeo Flexible**: Adaptable a cualquier plan contable nacional (España, Francia, Marruecos, México)
3. **Trazabilidad Total**: Cada movimiento es rastreable hasta su origen operativo
4. **Escalabilidad**: Diseñado para soportar millones de transacciones con análisis en tiempo real
5. **Subcuentas Automáticas**: Generación automática de subcuentas analíticas según dimensiones configuradas

### 1.2 Jerarquía del Sistema

```
Plan Contable Nacional
    ↓
Entidad Legal (Empresa)
    ↓
Mapeos Base (por tipo de elemento)
    ↓
Subcuentas Automáticas (según dimensiones)
    ↓
Asientos Contables con Análisis Multidimensional
```

## 2. Estructura de Cuentas y Subcuentas

### 2.1 Patrón de Nomenclatura

```
Cuenta Principal → Subcuenta → Dimensiones Analíticas
    711              711.001      {clinic:001, category:COS, product:045}
```

**Patrón de subcuentas**: `{cuenta}.{dim1}.{dim2}.{dim3}...`

### 2.2 Niveles de Cuentas

1. **Nivel 1**: Grupo principal (1 dígito) - Ej: 7 (Ventas)
2. **Nivel 2**: Subgrupo (2 dígitos) - Ej: 70 (Ventas de mercaderías)
3. **Nivel 3**: Cuenta (3 dígitos) - Ej: 700 (Ventas de mercaderías)
4. **Nivel 4**: Subcuenta (4+ dígitos) - Ej: 7001 (Ventas categoría específica)
5. **Nivel 5+**: Subcuentas analíticas - Ej: 700101 (Ventas categoría + clínica)

### 2.3 Generación de Códigos de Subcuenta

```typescript
// Patrón para generar códigos únicos de subcuenta
function generateSubaccountCode(baseAccount: string, dimensions: Dimension[]): string {
  let code = baseAccount;
  
  // Añadir código de categoría (2 dígitos)
  if (dimensions.category) {
    code += padCode(dimensions.category.code, 2);
  }
  
  // Añadir código de clínica (1 dígito)
  if (dimensions.clinic) {
    code += dimensions.clinic.code;
  }
  
  return code;
}
```

## 3. Lógica de Mapeo por Tipo de Operación

### 3.1 VENTAS (Facturas de Venta)

#### Servicios
```
Base España: 705 / Francia: 706 / Marruecos: 712 / México: 400
Subcuentas automáticas:
- Por categoría: {base}{categoryCode} (2 dígitos)
- Por clínica: {base}{categoryCode}{clinicCode} (1 dígito)

Ejemplos:
- 70501 → Servicios médicos
- 705011 → Servicios médicos en clínica Madrid
- 70502 → Servicios estéticos
- 705021 → Servicios estéticos en clínica Madrid
```

#### Productos
```
Base España: 701 / Francia: 707 / Marruecos: 711 / México: 401
Subcuentas automáticas:
- Por categoría: {base}{categoryCode}
- Por clínica: {base}{categoryCode}{clinicCode}

Ejemplos:
- 70101 → Productos farmacéuticos
- 701011 → Productos farmacéuticos clínica Madrid
- 70102 → Productos cosmética
- 701021 → Productos cosmética clínica Madrid
```

### 3.2 COMPRAS (Consumos)

```
Base España: 600 / Francia: 601 / Marruecos: 611 / México: 500
Subcuentas automáticas similares a ventas
```

### 3.3 COBROS (Métodos de Pago)

```
Mapeo por tipo de pago:
- CASH: 570 → 5701 (Caja clínica 1), 5702 (Caja clínica 2)
- CARD: 572 → 5721 (TPV clínica 1), 5722 (TPV clínica 2)
- BANK_TRANSFER: 572 → 572100 (Transferencias nacionales)
- DEFERRED: 430 → 4301 (Clientes 30 días), 4302 (Clientes 60 días)
```

### 3.4 IVA/Impuestos

```
IVA Repercutido: 477
- 47721 → IVA repercutido 21%
- 47710 → IVA repercutido 10%
- 47704 → IVA repercutido 4%

IVA Soportado: 472
- 47221 → IVA soportado 21%
- 47210 → IVA soportado 10%
```

### 3.5 Descuentos

```
Base: 708 (Rappels sobre ventas)
- 7081 → Descuentos manuales
- 7082 → Descuentos por promoción
- 7083 → Descuentos por volumen
```

## 4. Generación Automática de Subcuentas

### 4.1 Algoritmo de Generación

```typescript
async function createSubaccountIfNeeded(
  baseAccountId: string,
  dimensions: AccountingDimensions,
  legalEntityId: string
): Promise<string> {
  // 1. Generar código de subcuenta
  const subaccountCode = generateSubaccountCode(baseAccount.accountNumber, dimensions);
  
  // 2. Verificar si existe
  let subaccount = await prisma.chartOfAccountEntry.findFirst({
    where: { accountNumber: subaccountCode, legalEntityId }
  });
  
  // 3. Si no existe, crear
  if (!subaccount) {
    const name = generateSubaccountName(baseAccount, dimensions);
    
    subaccount = await prisma.chartOfAccountEntry.create({
      data: {
        accountNumber: subaccountCode,
        name,
        description: `Subcuenta analítica de ${baseAccount.name}`,
        level: baseAccount.level + 1,
        parentId: baseAccountId,
        isActive: true,
        canReceiveEntries: true,
        legalEntityId,
        systemId: baseAccount.systemId
      }
    });
  }
  
  return subaccount.id;
}
```

### 4.2 Nomenclatura de Subcuentas

```typescript
function generateSubaccountName(
  baseAccount: ChartOfAccountEntry,
  dimensions: AccountingDimensions
): string {
  let parts = [baseAccount.name];
  
  if (dimensions.category) {
    parts.push(dimensions.category.name);
  }
  
  if (dimensions.clinic) {
    parts.push(dimensions.clinic.name);
  }
  
  if (dimensions.service) {
    parts.push(dimensions.service.name);
  }
  
  return parts.join(' - ');
}
```

## 5. Flujos Contables por Tipo de Transacción

### 5.1 Ticket de Venta con Pagos Mixtos

#### Escenario Ejemplo
- Servicio masaje: 60€ (base)
- Producto crema: 30€ (base)
- Descuento manual: 5€
- **Base imponible**: 85€
- **IVA 21%**: 17.85€
- **Total**: 102.85€

Pagos:
- Efectivo: 25€
- Tarjeta: 25€
- Aplazado: 52.85€

#### Asiento Contable Generado

```
DEBE                                           HABER
----                                           -----
570101 Caja Clínica Madrid         25.00€     
572101 TPV Clínica Madrid          25.00€     
708101 Descuentos manuales Madrid   2.48€     
430101 Clientes aplazados          52.85€     
                                               705021 Ventas servicios masaje Madrid    29.76€
                                               701021 Ventas productos cosmética Madrid 14.88€
                                               477211 IVA repercutido 21% Madrid        8.85€
                                               430101 Clientes aplazados (contrapartida) 52.85€

Total: 105.33€ = 105.33€ ✓
```

**Nota importante**: Los pagos aplazados aparecen tanto en el DEBE como en el HABER para mantener el equilibrio del asiento.

### 5.2 Factura (Conversión de Ticket)

Cuando se convierte un ticket a factura:

1. **Solo se factura la parte efectivamente cobrada** (sin aplazados)
2. **El IVA se calcula proporcionalmente** sobre lo cobrado
3. **Los aplazados quedan como deuda pendiente**

## 6. Dimensiones Analíticas

### 6.1 Dimensiones Disponibles

- **CLINIC**: Centro/Clínica donde ocurre la transacción
- **CATEGORY**: Categoría del servicio/producto
- **SERVICE/PRODUCT**: Código específico del ítem
- **PROFESSIONAL**: Profesional que ejecuta
- **PAYMENT_METHOD**: Método de pago utilizado
- **PROMOTION**: Promoción aplicada
- **CUSTOMER_TYPE**: Tipo de cliente (particular/empresa/aseguradora)
- **TIME_PERIOD**: Período temporal (año/mes)

### 6.2 Metadata JSON en Asientos

Cada línea del asiento contable incluye metadata JSON:

```json
{
  "clinic": "001",
  "category": "MAS",
  "service": "SRV-045", 
  "payment": "CARD",
  "customer_type": "PARTICULAR",
  "transaction_type": "TICKET",
  "ticket_id": "TK-2024-001234",
  "professional": "DOC-123"
}
```

## 7. Configuración por País

### 7.1 España
```typescript
const SPAIN_CONFIG = {
  sales: {
    services: { base: "705", pattern: "{base}{category}{clinic}" },
    products: { base: "701", pattern: "{base}{category}{clinic}" }
  },
  purchases: {
    consumables: { base: "600", pattern: "{base}{category}{clinic}" }
  },
  vat: {
    output: { base: "477", rates: ["21", "10", "04"] },
    input: { base: "472", rates: ["21", "10", "04"] }
  }
};
```

### 7.2 Marruecos
```typescript
const MOROCCO_CONFIG = {
  sales: {
    services: { base: "712", pattern: "{base}{category}{clinic}" },
    products: { base: "711", pattern: "{base}{category}{clinic}" }
  },
  purchases: {
    consumables: { base: "611", pattern: "{base}{category}" }
  },
  vat: {
    output: { base: "4455", rates: ["20", "14", "10", "07"] },
    input: { base: "3455", rates: ["20", "14", "10", "07"] }
  }
};
```

### 7.3 Francia
```typescript
const FRANCE_CONFIG = {
  sales: {
    services: { base: "706", pattern: "{base}{category}{clinic}" },
    products: { base: "707", pattern: "{base}{category}{clinic}" }
  },
  vat: {
    output: { base: "4457", rates: ["20", "10", "055", "021"] }
  }
};
```

## 8. Implementación Técnica

### 8.1 Estructura de Datos Principal

```typescript
interface AccountingMapping {
  id: string;
  
  // Elemento mapeado
  categoryId?: string;
  serviceId?: string;
  productId?: string;
  paymentMethodId?: string;
  
  // Cuenta base
  accountId: string;
  
  // Configuración de subcuentas
  subaccountPattern?: string;  // Ej: "{base}{category}{clinic}"
  autoCreateSubaccounts: boolean;
  
  // Dimensiones analíticas
  analyticalDimensions?: {
    required: string[];  // Dimensiones obligatorias
    optional: string[];  // Dimensiones opcionales
  };
  
  // Contexto
  legalEntityId: string;
  systemId: string;
  
  // Aplicabilidad
  appliesToServices?: boolean;
  appliesToProducts?: boolean;
}
```

### 8.2 Servicio de Generación de Asientos

```typescript
class JournalEntryService {
  static async generateFromTicket(
    ticket: Ticket,
    mappings: AccountingMappings
  ): Promise<JournalEntry> {
    const lines: JournalEntryLine[] = [];
    
    // 1. Calcular porcentaje pagado (excluyendo aplazados)
    const paidPercentage = calculatePaidPercentage(ticket);
    
    // 2. Generar líneas de ventas (proporcionalmente)
    for (const [categoryId, amount] of salesByCategory) {
      const proportionalAmount = amount * paidPercentage;
      const accountId = await getOrCreateSubaccount(
        categoryMapping,
        { category: categoryId, clinic: ticket.clinicId }
      );
      
      lines.push({
        accountId,
        debit: 0,
        credit: proportionalAmount,
        description: `Ventas ${category.name}`,
        metadata: { category: categoryId, clinic: ticket.clinicId }
      });
    }
    
    // 3. Líneas de IVA (proporcional)
    // 4. Líneas de cobros (solo efectivos)
    // 5. Líneas de deuda (si hay aplazados)
    
    return createJournalEntry(lines);
  }
}
```

### 8.3 API de Mapeo Automático

```typescript
async function autoMapAllElements(
  legalEntityId: string,
  types: MappingType[]
): Promise<MappingResult> {
  const chartOfAccounts = await getChartOfAccounts(legalEntityId);
  
  for (const category of unmappedCategories) {
    // 1. Encontrar cuenta base según reglas
    const baseAccount = findBestMatch(category, chartOfAccounts);
    
    // 2. Crear mapeo con patrón de subcuenta
    await createCategoryMapping({
      categoryId: category.id,
      accountId: baseAccount.id,
      subaccountPattern: "{base}{category}{clinic}",
      autoCreateSubaccounts: true,
      legalEntityId
    });
    
    // 3. Pre-generar subcuentas comunes
    for (const clinic of activeClinics) {
      await createSubaccountIfNeeded(
        baseAccount.id,
        { category, clinic },
        legalEntityId
      );
    }
  }
}
```

## 9. Mejores Prácticas y Extensibilidad

### 9.1 Mejores Prácticas

1. **Consistencia en Códigos**: Usar siempre el mismo formato para códigos de dimensiones
2. **Documentación de Mapeos**: Documentar la lógica de cada mapeo en la descripción
3. **Validación de Subcuentas**: Verificar que no se exceda la longitud máxima del plan contable
4. **Cache de Subcuentas**: Cachear subcuentas frecuentes para mejorar rendimiento
5. **Auditoría**: Registrar todos los cambios en mapeos y creación de subcuentas

### 9.2 Extensibilidad

#### Añadir Nueva Dimensión Analítica

1. **Definir la dimensión** en el enum de dimensiones
2. **Actualizar patrones** de subcuentas para incluirla
3. **Modificar generadores** de códigos y nombres
4. **Actualizar UI** para mostrar la nueva dimensión

#### Añadir Nuevo País

1. **Crear configuración** específica del país
2. **Mapear cuentas base** según plan contable nacional
3. **Definir patrones** de subcuentas apropiados
4. **Configurar tipos de IVA** y tasas

### 9.3 Consideraciones de Rendimiento

1. **Índices en BD**: Crear índices en accountNumber y dimensiones frecuentes
2. **Batch Processing**: Crear subcuentas en lotes cuando sea posible
3. **Lazy Loading**: Solo crear subcuentas cuando se usen por primera vez
4. **Archivado**: Archivar subcuentas no usadas después de X meses

### 9.4 Seguridad y Control

1. **Permisos**: Solo usuarios autorizados pueden crear/modificar mapeos
2. **Validación**: Validar que las cuentas existan antes de mapear
3. **Bloqueo**: No permitir eliminar mapeos con movimientos contables
4. **Trazabilidad**: Log completo de todas las operaciones

## Conclusión

Este sistema proporciona una solución completa y escalable para la gestión contable multidimensional, permitiendo:

- Análisis detallado por múltiples dimensiones simultáneamente
- Adaptación a cualquier plan contable nacional
- Generación automática de estructura analítica
- Trazabilidad completa de todas las operaciones
- Escalabilidad para grandes volúmenes de datos

La clave del éxito está en la configuración inicial correcta de los mapeos base y la definición clara de las dimensiones analíticas relevantes para cada negocio.
