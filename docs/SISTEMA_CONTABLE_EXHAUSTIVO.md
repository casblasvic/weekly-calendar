# Sistema Contable Multidimensional - Documentación Exhaustiva

## 1. Arquitectura General del Sistema

### 1.1 Principios Fundamentales

1. **Contabilidad Multidimensional**: Cada transacción puede analizarse desde múltiples perspectivas
2. **Mapeo Flexible**: Adaptable a cualquier plan contable nacional (España, Francia, Marruecos, México)
3. **Trazabilidad Total**: Cada movimiento es rastreable hasta su origen operativo
4. **Escalabilidad**: Diseñado para soportar millones de transacciones con análisis en tiempo real

### 1.2 Estructura de Cuentas y Subcuentas

```
Cuenta Principal → Subcuenta → Dimensiones Analíticas
    711              711.001      {clinic:001, category:COS, product:045}
```

**Patrón de subcuentas**: `{cuenta}.{dim1}.{dim2}.{dim3}...`

### 1.3 Dimensiones Analíticas Disponibles

- **CLINIC**: Centro/Clínica donde ocurre la transacción
- **CATEGORY**: Categoría del servicio/producto
- **SERVICE/PRODUCT**: Código específico del ítem
- **PROFESSIONAL**: Profesional que ejecuta
- **PAYMENT**: Método de pago utilizado
- **PROMOTION**: Promoción aplicada
- **ENTITY_SEGMENT**: Segmento del cliente/proveedor
- **TIME_PERIOD**: Año/Mes de la transacción

## 2. Flujo Ejemplo: Venta Combinada con Múltiples Pagos

### 2.1 Escenario
- Cliente compra:
  - Crema solar: 40€ (producto)
  - Servicio masaje: 60€ (servicio)
  - **Total**: 100€
- Formas de pago:
  - Efectivo: 33€
  - Tarjeta: 33€
  - Aplazado: 34€

### 2.2 Apuntes Contables Generados

#### TICKET DE VENTA (sin factura)

```
DEBE                                        HABER
----                                        -----
570.001 Caja Clínica Madrid      33.00€    
572.001 Bancos - TPV             33.00€    
430.REG Clientes regulares       34.00€    
                                           711.001.COS Venta productos cosmética    40.00€
                                           712.001.MAS Venta servicios masaje      60.00€

Dimensiones JSON en cada línea:
{
  "clinic": "001",
  "category": "COS/MAS", 
  "payment": "CASH/CARD/DEFERRED",
  "entity_segment": "REG",
  "transaction_type": "TICKET",
  "ticket_id": "TK-2024-001234"
}
```

#### CONSUMO DE STOCK (automático)

```
DEBE                                        HABER
----                                        -----
611.001.COS Consumo productos    25.00€    
                                           300.001.COS.045 Stock crema solar        25.00€

Dimensiones:
{
  "clinic": "001",
  "category": "COS",
  "product": "045",
  "movement_type": "SALE_CONSUMPTION"
}
```

### 2.3 Conversión a Factura (días después)

Cuando el cliente solicita factura, se generan apuntes de reclasificación:

```
DEBE                                        HABER
----                                        -----
711.001.COS Venta productos      40.00€    
712.001.MAS Venta servicios      60.00€    
                                           711.001.COS Venta productos (ticket)     40.00€
                                           712.001.MAS Venta servicios (ticket)     60.00€
                                           477.21 IVA repercutido 21%               21.00€
430.REG Clientes regulares       21.00€    

Dimensiones adicionales:
{
  "invoice_number": "FAC-2024-000123",
  "original_ticket": "TK-2024-001234",
  "vat_type": "21"
}
```

### 2.4 Devolución de Producto

Cliente devuelve la crema solar:

```
DEBE                                        HABER
----                                        -----
711.001.COS Venta productos      40.00€    
477.21 IVA repercutido           8.40€     
                                           570.001 Caja (devolución efectivo)      48.40€
300.001.COS.045 Stock crema      25.00€    
                                           611.001.COS Consumo productos            25.00€

Dimensiones:
{
  "return_reason": "CUSTOMER_REQUEST",
  "original_invoice": "FAC-2024-000123",
  "return_ticket": "DEV-2024-000045"
}
```

## 3. Ciclo de Compras y Stock

### 3.1 Factura de Compra al Proveedor

```
DEBE                                        HABER
----                                        -----
600.001.COS Compras cosmética   200.00€    
472.21 IVA soportado 21%         42.00€    
                                           400.PRO.001 Proveedor Cosmética SA     242.00€

Dimensiones:
{
  "supplier": "001",
  "supplier_segment": "PRO",
  "purchase_invoice": "FC-PROV-2024-0234"
}
```

### 3.2 Entrada en Stock

```
DEBE                                        HABER
----                                        -----
300.001.COS.045 Stock crema     200.00€    
                                           611.001.COS Variación existencias       200.00€
```

## 4. Mapeos Contables Configurados

### 4.1 Servicios → Cuentas
```typescript
{
  baseAccount: "712", // Marruecos: Prestación de servicios
  pattern: "{base}.{clinic}.{category}",
  dimensions: ["CLINIC", "CATEGORY", "SERVICE"]
}
```

### 4.2 Productos → Cuentas
```typescript
{
  salesAccount: "711",     // Venta de mercaderías
  purchaseAccount: "611",  // Compras de mercaderías
  stockAccount: "300",     // Mercaderías
  pattern: "{base}.{clinic}.{category}.{product}",
  dimensions: ["CLINIC", "CATEGORY", "PRODUCT"]
}
```

### 4.3 Métodos de Pago → Cuentas
```typescript
{
  CASH: "570",           // Caja
  CARD: "572",           // Bancos
  BANK_TRANSFER: "572",  // Bancos
  DEFERRED_PAYMENT: "430", // Clientes
  INTERNAL_CREDIT: "438"   // Anticipos clientes
}
```

## 5. APIs para Desarrolladores

### 5.1 Crear Mapeo Contable

```typescript
POST /api/accounting/save-mappings
{
  legalEntityId: "le-001",
  entityType: "service|product|payment|vat",
  mappings: [{
    entityId: "srv-001",
    accountNumber: "712",
    pattern: "{base}.{clinic}",
    dimensions: ["CLINIC", "CATEGORY"]
  }]
}
```

### 5.2 Generar Asiento Contable

```typescript
POST /api/accounting/journal-entries
{
  type: "TICKET|INVOICE|PAYMENT|RETURN",
  entries: [{
    accountNumber: "570.001",
    debit: 33.00,
    credit: 0,
    dimensions: {
      clinic: "001",
      payment: "CASH"
    }
  }],
  metadata: {
    ticketId: "TK-001",
    clinicId: "clinic-001"
  }
}
```

### 5.3 Consultar Análisis Multidimensional

```typescript
GET /api/accounting/analytics
?accountPattern=712.*
&dimensions[clinic]=001
&dimensions[category]=MAS
&dateFrom=2024-01-01
&dateTo=2024-12-31

Response:
{
  totalRevenue: 15000,
  transactionCount: 250,
  averageTicket: 60,
  byMonth: [...],
  byProfessional: [...]
}
```

## 6. Modelos Pendientes de Implementar

### 6.1 Modelo Supplier (Proveedor)
```prisma
model Supplier {
  id            String   @id @default(cuid())
  systemId      String
  code          String
  name          String
  taxId         String?
  segment       String   // PRO, MAT, SER
  accountNumber String?  // 400.XXX
  
  purchases     Purchase[]
  invoices      PurchaseInvoice[]
  
  @@unique([systemId, code])
}
```

### 6.2 Modelo PurchaseInvoice
```prisma
model PurchaseInvoice {
  id              String   @id @default(cuid())
  supplierId      String
  invoiceNumber   String
  date            DateTime
  totalAmount     Decimal
  vatAmount       Decimal
  status          String   // PENDING, PAID, CANCELLED
  
  lines           PurchaseInvoiceLine[]
  journalEntries  JournalEntry[]
  payments        SupplierPayment[]
}
```

### 6.3 Modelo Expense
```prisma
model Expense {
  id            String   @id @default(cuid())
  clinicId      String
  expenseTypeId String
  amount        Decimal
  date          DateTime
  accountNumber String   // 62X
  dimensions    Json
  
  journalEntries JournalEntry[]
}
```

### 6.4 Integración de Nuevos Modelos

Cuando se implementen estos modelos, deben:

1. **Seguir el patrón de mapeo**: Cada entidad debe tener su AccountMapping
2. **Incluir dimensiones**: Almacenar en JSON las dimensiones analíticas
3. **Generar asientos automáticos**: Al crear/modificar, generar JournalEntry
4. **Respetar el patrón de subcuentas**: Usar el SubaccountGenerator

## 7. Configuración para Nuevos Países

### 7.1 Proceso de Adaptación

1. **Definir cuentas base** en `country-accounts.ts`:
```typescript
export const MOROCCO_ACCOUNTS = {
  sales: { services: "712", products: "711" },
  purchases: { products: "611", services: "613" },
  cash: "570",
  banks: "572",
  customers: "342",
  suppliers: "441",
  vat: { collected: "445", paid: "345" }
}
```

2. **Configurar patrones** específicos del país
3. **Mapear automáticamente** usando heurísticas
4. **Generar subcuentas** según necesidades locales

### 7.2 Ejemplo: Adaptación a México

```typescript
// mexico-config.ts
export const MEXICO_CONFIG = {
  accounts: {
    sales: "4000",
    purchases: "5000",
    iva: { trasladado: "2080", acreditable: "1180" }
  },
  patterns: {
    rfc: true,  // Incluir RFC en dimensiones
    cfdi: true  // Vincular con CFDI
  }
}
```

## 8. Análisis y Reporting

### 8.1 Consultas SQL Optimizadas

```sql
-- Ventas por categoría y clínica
SELECT 
  JSON_EXTRACT(dimensions, '$.clinic') as clinic,
  JSON_EXTRACT(dimensions, '$.category') as category,
  SUM(credit - debit) as revenue
FROM journal_entries
WHERE account_number LIKE '712.%'
  AND date BETWEEN ? AND ?
GROUP BY 1, 2

-- Análisis de márgenes por producto
SELECT 
  p.name,
  SUM(CASE WHEN je.account LIKE '711%' THEN credit ELSE 0 END) as sales,
  SUM(CASE WHEN je.account LIKE '611%' THEN debit ELSE 0 END) as cost,
  (sales - cost) / sales * 100 as margin_pct
FROM journal_entries je
JOIN products p ON JSON_EXTRACT(je.dimensions, '$.product') = p.code
GROUP BY p.id
```

### 8.2 KPIs Automáticos

- **Rentabilidad por servicio**: Ingresos - Costes directos
- **Rotación de stock**: Coste ventas / Stock medio
- **Días cobro clientes**: (Clientes / Ventas) × 365
- **Productividad profesional**: Ingresos / Horas trabajadas

## 9. Seguridad y Compliance

### 9.1 Privacidad (GDPR/LOPD)
- No se crean cuentas individuales por cliente
- Uso de segmentos agregados (VIP, REG, OCA)
- Datos personales separados de contabilidad

### 9.2 Integridad Contable
- Partida doble siempre cuadrada
- Trazabilidad completa
- Logs de auditoría inmutables
- Validaciones en cada nivel

## 10. Escalabilidad Futura

### 10.1 Presentación Automática de Impuestos
- Estructura preparada para generar modelos fiscales
- Dimensiones incluyen toda info necesaria
- Fácil extracción de datos por periodo

### 10.2 Machine Learning
- Predicción de flujos de caja
- Detección de anomalías
- Optimización de precios
- Análisis predictivo de demanda

### 10.3 Integración con ERPs
- APIs RESTful documentadas
- Webhooks para eventos contables
- Importación/exportación estándar
- Compatibilidad con formatos comunes

## Conclusión

Este sistema contable multidimensional proporciona:
- **Flexibilidad** para adaptarse a cualquier negocio
- **Potencia** para análisis complejos
- **Simplicidad** en la implementación
- **Escalabilidad** para crecer sin límites

La arquitectura está diseñada para que agregar nuevos modelos (proveedores, gastos, etc.) sea tan simple como seguir los patrones establecidos, garantizando consistencia y mantenibilidad a largo plazo.
