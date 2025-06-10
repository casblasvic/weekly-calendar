# Sistema de Cuentas y Subcuentas Multidimensional
## El Mejor Sistema Contable para SaaS Multi-clínica

### Principios Fundamentales

1. **Flexibilidad Máxima**: El sistema debe adaptarse a cualquier necesidad de análisis sin modificar la estructura base
2. **Escalabilidad**: Debe funcionar igual de bien para 1 clínica que para 1000
3. **Trazabilidad Completa**: Cada transacción debe poder rastrearse hasta su origen más específico
4. **Análisis Multidimensional**: Permitir análisis por múltiples ejes simultáneamente

### Estructura Propuesta

#### Nivel 1: Cuenta Principal (Plan Contable Estándar)
```
7124 - Venta de servicios médicos
7111 - Venta de productos
6111 - Compra de productos
570  - Caja
```

#### Nivel 2: Subcuentas Dinámicas con Patrones

**Patrón Base**: `{cuenta}.{dimensión1}.{dimensión2}.{dimensión3}...`

**Dimensiones Disponibles**:
- `{clinic}` - ID o código de clínica
- `{category}` - ID de categoría
- `{service}` - ID de servicio
- `{product}` - ID de producto
- `{professional}` - ID de profesional
- `{payment}` - Método de pago
- `{promotion}` - ID de promoción aplicada
- `{package}` - ID de paquete/bono
- `{supplier}` - ID de proveedor
- `{terminal}` - ID de terminal POS
- `{year}` - Año fiscal
- `{month}` - Mes
- `{custom1-5}` - Campos personalizables

### Casos de Uso Reales

#### 1. Servicio de Tratamiento Facial
```
Cuenta: 7124.001.002.005.2024
Desglose:
- 7124: Venta de servicios médicos
- 001: Clínica Madrid Centro
- 002: Categoría Facial
- 005: Servicio "Limpieza Facial Profunda"
- 2024: Año

Análisis posible:
- Ingresos totales por servicios: 7124.*
- Ingresos clínica Madrid: 7124.001.*
- Ingresos faciales todas las clínicas: 7124.*.002.*
- Ingresos limpieza facial 2024: 7124.*.*.005.2024
```

#### 2. Venta de Producto Cosmético
```
Cuenta: 7111.001.003.045.P.2024
Desglose:
- 7111: Venta de productos
- 001: Clínica Madrid Centro
- 003: Categoría Cosmética
- 045: Producto "Crema Hidratante Premium"
- P: Indicador de venta directa (vs consumo en servicio)
- 2024: Año
```

#### 3. Compra de Producto (Consumible)
```
Cuenta: 6111.001.003.045.C.2024
Desglose:
- 6111: Compra de productos
- 001: Clínica Madrid Centro
- 003: Categoría Cosmética
- 045: Producto "Crema Hidratante Premium"
- C: Indicador de consumible
- 2024: Año
```

### Implementación Técnica

#### 1. Generación de Subcuentas
```typescript
interface SubaccountContext {
  clinicId?: string;
  categoryId?: string;
  serviceId?: string;
  productId?: string;
  professionalId?: string;
  paymentMethodId?: string;
  promotionId?: string;
  year?: number;
  month?: number;
  customFields?: Record<string, string>;
}

function generateSubaccount(
  baseAccount: string,
  pattern: string,
  context: SubaccountContext
): string {
  // Reemplazar tokens en el patrón con valores reales
  let subaccount = pattern.replace('{base}', baseAccount);
  
  // Mapear IDs a códigos cortos para mantener longitud razonable
  subaccount = subaccount.replace('{clinic}', getShortCode('clinic', context.clinicId));
  subaccount = subaccount.replace('{category}', getShortCode('category', context.categoryId));
  // ... etc
  
  return subaccount;
}
```

#### 2. Mapeo de Categorías como Agrupadores
```typescript
// Al mapear un servicio, considerar su categoría
interface ServiceMapping {
  serviceId: string;
  accountId: string; // 7124 para servicios
  subaccountPattern: string; // "{base}.{clinic}.{category}.{service}"
  analyticalDimensions: {
    category: string; // Heredado del servicio
    serviceType: string; // médico, estético, etc.
  }
}

// Al mapear un producto, considerar su uso
interface ProductMapping {
  productId: string;
  accountType: 'SALES' | 'PURCHASE';
  accountId: string; // 7111 para ventas, 6111 para compras
  subaccountPattern: string; // "{base}.{clinic}.{category}.{product}.{usage}"
  analyticalDimensions: {
    category: string;
    usage: 'DIRECT_SALE' | 'SERVICE_CONSUMABLE';
  }
}
```

#### 3. Configuración Flexible por Sistema
```typescript
interface AccountingConfiguration {
  systemId: string;
  subaccountSettings: {
    maxLength: number; // Ej: 20 caracteres
    separator: string; // Ej: "." o "-"
    dimensionOrder: string[]; // ["clinic", "category", "item", "year"]
    shortCodeMappings: Record<string, string>; // ID largo -> código corto
  };
  analyticalDimensions: {
    enabled: string[]; // Dimensiones activas
    customLabels: Record<string, string>; // custom1 -> "Centro de Coste"
  };
}
```

### Ventajas Competitivas

1. **Análisis Instantáneo**: Consultas SQL simples con LIKE permiten análisis complejos
   ```sql
   -- Ingresos por categoría en todas las clínicas
   SELECT 
     SUBSTRING(account_code, 10, 3) as category_code,
     SUM(amount) as total
   FROM journal_entries
   WHERE account_code LIKE '7124.%.___.___.%'
   GROUP BY category_code;
   ```

2. **Informes Personalizables**: Los usuarios pueden crear sus propios informes sin programación

3. **Compatibilidad Total**: La cuenta base sigue siendo estándar, las subcuentas son extensiones

4. **Auditoría Perfecta**: Cada transacción tiene contexto completo

5. **Machine Learning Ready**: Estructura perfecta para análisis predictivo

### Configuración Inicial por Tipo de Negocio

#### Centro Médico-Estético
```
Patrones predefinidos:
- Servicios médicos: {base}.{clinic}.{category}.{service}.{professional}
- Servicios estéticos: {base}.{clinic}.{category}.{service}
- Productos venta: {base}.{clinic}.{category}.{product}.V
- Productos consumo: {base}.{clinic}.{category}.{product}.C
```

#### Spa/Wellness
```
Patrones predefinidos:
- Servicios: {base}.{clinic}.{area}.{service}
- Paquetes: {base}.{clinic}.PACK.{package}
- Productos: {base}.{clinic}.{line}.{product}
```

### Migración y Adopción

1. **Fase 1**: Implementar estructura básica manteniendo compatibilidad
2. **Fase 2**: Migrar datos históricos con mapeo automático
3. **Fase 3**: Activar análisis avanzados
4. **Fase 4**: Personalización por cliente

## Mapeo de Entidades Relacionadas (Empleados, Clientes, Proveedores)

### ❌ Método Tradicional (NO recomendado):
- Crear una cuenta individual por cada cliente: 430.00001, 430.00002, etc.
- Problemas: Miles de cuentas, sin privacidad, difícil análisis

### ✅ Nuestro Método (RECOMENDADO):
Las entidades se manejan como **dimensiones analíticas** en cuentas agregadoras:

#### Implementación Técnica:

1. **Cuentas Agregadoras con Segmentación**:
   ```
   430 - Clientes
     ├── 430.VIP - Clientes VIP (>1000€ últimos 6 meses)
     ├── 430.REG - Clientes regulares (100-1000€)
     └── 430.OCA - Clientes ocasionales (<100€)
   
   400 - Proveedores
     ├── 400.PRO - Proveedores de productos
     ├── 400.SER - Proveedores de servicios
     └── 400.OTR - Otros proveedores
   
   640 - Gastos de personal
     ├── 640.DOC - Personal médico
     ├── 640.AUX - Personal auxiliar
     └── 640.ADM - Personal administrativo
   ```

2. **Almacenamiento en Base de Datos**:
   ```json
   // En cada transacción contable:
   {
     "accountNumber": "430.VIP",
     "analyticalDimensions": {
       "client": "C001",
       "clientName": "María García",
       "segment": "VIP"
     }
   }
   ```

3. **Configuración de Segmentos** (EntitySegmentConfig):
   ```javascript
   {
     entityType: "client",
     segments: [
       { code: "VIP", name: "Clientes VIP", criteria: ">1000€ últimos 6 meses" },
       { code: "REG", name: "Regulares", criteria: "100-1000€" },
       { code: "OCA", name: "Ocasionales", criteria: "<100€" }
     ]
   }
   ```

### Ejemplos de Consultas SQL Potentes:

```sql
-- Análisis de ingresos por segmento de cliente
SELECT 
  JSON_EXTRACT(analyticalDimensions, '$.segment') as segmento,
  SUM(amount) as total_ingresos
FROM accounting_entries
WHERE account LIKE '7%' 
  AND JSON_EXTRACT(analyticalDimensions, '$.client') IS NOT NULL
GROUP BY segmento;

-- Top 10 clientes VIP por facturación
SELECT 
  JSON_EXTRACT(analyticalDimensions, '$.clientName') as cliente,
  SUM(amount) as facturacion_total
FROM accounting_entries
WHERE account LIKE '7%'
  AND JSON_EXTRACT(analyticalDimensions, '$.segment') = 'VIP'
GROUP BY cliente
ORDER BY facturacion_total DESC
LIMIT 10;

-- Análisis de gastos de personal por rol y clínica
SELECT 
  JSON_EXTRACT(analyticalDimensions, '$.clinic') as clinica,
  JSON_EXTRACT(analyticalDimensions, '$.role') as rol,
  SUM(amount) as gasto_total
FROM accounting_entries
WHERE account LIKE '640%'
GROUP BY clinica, rol;

-- Proveedores con mayor volumen de compras
SELECT 
  JSON_EXTRACT(analyticalDimensions, '$.supplierName') as proveedor,
  JSON_EXTRACT(analyticalDimensions, '$.category') as categoria,
  COUNT(*) as num_transacciones,
  SUM(amount) as volumen_total
FROM accounting_entries
WHERE account LIKE '60%' OR account LIKE '400%'
GROUP BY proveedor, categoria
HAVING volumen_total > 5000
ORDER BY volumen_total DESC;
```

### Ventajas del Enfoque:

1. **Privacidad GDPR/LOPD**: Los nombres no aparecen en el plan de cuentas
2. **Escalabilidad**: Maneja millones de entidades sin crear cuentas
3. **Análisis Dinámico**: Agrupa por cualquier criterio sin cambiar estructura
4. **Auditoría Completa**: Toda la información en las dimensiones analíticas
5. **Machine Learning Ready**: Estructura perfecta para análisis predictivo

### API Endpoint para Configuración:

```typescript
// GET /api/accounting/entity-dimensions
// Obtiene configuración actual y estadísticas

// POST /api/accounting/entity-dimensions
{
  "entityType": "client",
  "segments": [
    { "code": "VIP", "name": "Clientes VIP", "criteria": ">1000€" }
  ]
}
```

### Integración con el Sistema de Subcuentas:

Cuando se registra una venta a un cliente:
1. El sistema identifica el segmento del cliente automáticamente
2. Genera la subcuenta: `7124.001.FAC.005.VIP`
3. Almacena las dimensiones analíticas completas
4. Permite análisis multidimensional instantáneo

### Conclusión

Este sistema convierte cada transacción en un punto de datos rico que puede ser analizado desde múltiples perspectivas sin perder simplicidad en la operación diaria. Es la base perfecta para construir el mejor SaaS de gestión para clínicas del mundo.
