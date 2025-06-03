# Propuesta de Arquitectura Escalable para Mapeos Contables

## Análisis de la Situación Actual

### Patrón Actual
Actualmente, cada tipo de elemento que necesita mapeo contable tiene su propia tabla:
- `CategoryAccountMapping`
- `PaymentMethodAccountMapping`
- `VATTypeAccountMapping`
- `ExpenseTypeAccountMapping`
- `CashSessionAccountMapping`
- `DiscountTypeAccountMapping`

### Ventajas del Enfoque Actual
✅ **Tipado fuerte**: Cada relación está claramente definida
✅ **Integridad referencial**: Las FK garantizan consistencia
✅ **Rendimiento**: Índices específicos para cada tipo
✅ **Claridad**: Es evidente qué está mapeado y cómo

### Desventajas del Enfoque Actual
❌ **Poca escalabilidad**: Nuevo modelo = Nueva tabla de mapeo
❌ **Duplicación de código**: APIs y UI similares para cada tipo
❌ **Mantenimiento**: Múltiples migraciones y cambios
❌ **Rigidez**: Difícil añadir nuevos tipos dinámicamente

## Propuesta de Arquitectura Escalable

### Opción 1: Mapeo Genérico con Registro de Tipos

```prisma
// Registro de tipos mapeables
model AccountMappableType {
  id          String  @id @default(cuid())
  code        String  @unique // "CATEGORY", "PAYMENT_METHOD", "EXPENSE_TYPE"
  modelName   String  // "Category", "PaymentMethodDefinition", "ExpenseType"
  displayName Json    // {"es": "Categorías", "fr": "Catégories"}
  isActive    Boolean @default(true)
  
  // Configuración del mapeo
  requiresInputAccount  Boolean @default(false) // Para IVA
  requiresOutputAccount Boolean @default(false) // Para IVA
  allowMultipleAccounts Boolean @default(false) // Para futuro
  
  systemId String
  system   System @relation(...)
  
  mappings GenericAccountMapping[]
}

// Mapeo genérico
model GenericAccountMapping {
  id            String @id @default(cuid())
  mappableType  AccountMappableType @relation(...)
  entityId      String // ID del elemento mapeado
  accountId     String
  account       ChartOfAccountEntry @relation(...)
  
  // Para casos especiales como IVA
  mappingRole   String? // "INPUT", "OUTPUT", "DEFAULT"
  
  legalEntityId String
  systemId      String
  
  @@unique([mappableType, entityId, legalEntityId, mappingRole])
}
```

### Opción 2: Interfaz/Trait en el Código

```typescript
// interfaz que los modelos pueden implementar
interface AccountMappable {
  getEntityType(): string;
  getDisplayName(): string;
  requiresMultipleAccounts(): boolean;
  getAccountRoles(): string[];
}

// Registro automático al iniciar la aplicación
const MAPPABLE_MODELS = [
  { model: 'Category', handler: CategoryMappingHandler },
  { model: 'PaymentMethodDefinition', handler: PaymentMappingHandler },
  // Se pueden añadir dinámicamente
];
```

### Opción 3: Híbrido (Recomendado) 🌟

Mantener las tablas específicas para relaciones críticas pero con una capa de abstracción:

```prisma
// En cada modelo que necesita mapeo, añadir campo metadata
model Category {
  // ... campos existentes ...
  
  // Nuevo campo para indicar capacidades
  accountingMetadata Json? @default('{"mappable": true, "mappingType": "STANDARD"}')
}

// Tabla de configuración central
model AccountingMappingConfig {
  id           String @id @default(cuid())
  entityType   String @unique // "Category", "ExpenseType", etc.
  tableName    String // "category_account_mappings"
  apiEndpoint  String // "/api/accounting/category-mappings"
  
  // Configuración UI
  uiComponent  String // "CategoryAccountMapper"
  icon         String // "folder"
  displayOrder Int
  
  // Reglas de mapeo
  mappingRules Json // {"requiresActiveAccount": true, "allowedAccountTypes": ["EXPENSE", "REVENUE"]}
  
  isActive     Boolean @default(true)
  systemId     String
}
```

## Implementación Recomendada

### Fase 1: Capa de Abstracción (2-3 días)
1. Crear `AccountingMappingConfig` sin romper lo existente
2. Registrar todos los tipos de mapeo actuales
3. Crear componente UI genérico que lea la configuración

### Fase 2: API Unificada (1 semana)
```typescript
// API genérica que delega a las específicas
app.get('/api/accounting/mappings/:entityType', async (req, res) => {
  const config = await getMapingConfig(req.params.entityType);
  const handler = await import(config.apiEndpoint);
  return handler.GET(req, res);
});
```

### Fase 3: Auto-Descubrimiento (2-3 días)
```typescript
// En el modelo
@AccountMappable({
  displayName: 'Tipos de Gasto',
  mappingType: 'STANDARD',
  allowedAccountTypes: ['EXPENSE']
})
class ExpenseType extends Model {
  // ...
}

// Sistema que escanea modelos al iniciar
const mappableModels = discoverMappableModels();
mappableModels.forEach(model => {
  registerMappingEndpoints(model);
  registerUIComponents(model);
});
```

## Beneficios de la Arquitectura Híbrida

### ✅ Escalabilidad Automática
- Nuevos modelos se registran con un decorador/metadata
- UI y APIs se generan automáticamente
- Sin necesidad de nuevas migraciones para cada tipo

### ✅ Mantiene la Integridad
- Las tablas específicas mantienen las FK
- Validaciones específicas por tipo
- Rendimiento óptimo con índices apropiados

### ✅ Flexibilidad
- Configuración por JSON permite cambios sin código
- Reglas de negocio centralizadas
- UI adaptable según el tipo

### ✅ Compatibilidad
- No rompe el código existente
- Migración gradual posible
- APIs existentes siguen funcionando

## Ejemplo de Uso Futuro

```typescript
// Nuevo modelo que necesita mapeo
model SupplierCategory {
  id   String @id
  name String
  
  // Solo añadir metadata
  accountingMetadata Json @default('{"mappable": true, "mappingType": "SUPPLIER"}')
}

// El sistema automáticamente:
// 1. Detecta el nuevo modelo mapeable
// 2. Crea endpoints API
// 3. Añade pestaña en UI
// 4. Aplica reglas de validación
```

## Conclusión

La arquitectura propuesta permite:
- **Escalabilidad**: Nuevos tipos sin cambios estructurales
- **Mantenibilidad**: Código DRY y reutilizable  
- **Flexibilidad**: Configuración sin recompilación
- **Robustez**: Mantiene integridad referencial

Es el balance perfecto entre la solidez del diseño actual y la flexibilidad necesaria para crecer. 