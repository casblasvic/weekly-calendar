# Arquitectura de Mapeos Contables Escalable

## Resumen

Este documento describe la arquitectura implementada para el mapeo de elementos del sistema a cuentas contables, diseñada para ser escalable y fácilmente extensible a nuevas entidades.

## Arquitectura Actual

### Modelos de Mapeo Implementados

1. **CategoryAccountMapping**
   - Mapea categorías de servicios/productos a cuentas contables
   - Soporta herencia de categorías padre a hijas
   - Permite diferentes mapeos por entidad legal

2. **PaymentMethodAccountMapping**
   - Mapea métodos de pago a cuentas contables
   - Un mapeo por método de pago y entidad legal

3. **ServiceAccountMapping** (Futuro)
   - Mapeos específicos por servicio individual

4. **ProductAccountMapping** (Futuro)
   - Mapeos específicos por producto individual

### Patrón Común

Todos los modelos de mapeo siguen el mismo patrón:

```prisma
model [Entity]AccountMapping {
  id              String   @id @default(cuid())
  [entity]Id      String   // ID de la entidad (categoría, método pago, etc.)
  [entity]        [Entity] @relation(...)
  accountId       String   // ID de la cuenta contable
  account         ChartOfAccountEntry @relation(...)
  legalEntityId   String   // ID de la entidad legal
  legalEntity     LegalEntity @relation(...)
  systemId        String   // ID del sistema/tenant
  system          System   @relation(...)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([[entity]Id, legalEntityId])
  @@index([legalEntityId])
  @@index([systemId])
}
```

## Cómo Añadir Nuevos Mapeos

### 1. Definir el Modelo en Prisma

Para añadir mapeo de gastos (expenses):

```prisma
model ExpenseAccountMapping {
  id              String   @id @default(cuid())
  expenseTypeId   String
  expenseType     ExpenseType @relation(fields: [expenseTypeId], references: [id])
  accountId       String
  account         ChartOfAccountEntry @relation(fields: [accountId], references: [id])
  legalEntityId   String
  legalEntity     LegalEntity @relation(fields: [legalEntityId], references: [id])
  systemId        String
  system          System   @relation(fields: [systemId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([expenseTypeId, legalEntityId])
  @@index([legalEntityId])
  @@index([systemId])
  @@map("expense_account_mappings")
}
```

### 2. Crear el Endpoint de API

```typescript
// app/api/accounting/expense-mappings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const ExpenseMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.record(z.string()) // { expenseTypeId: accountId }
});

export async function POST(request: NextRequest) {
  // Seguir el mismo patrón que category-mappings/route.ts
}
```

### 3. Añadir al Componente de Configuración

En `AccountingMappingConfigurator.tsx`, añadir una nueva pestaña:

```typescript
// 1. Añadir la query para elementos sin mapear
const { data: unmappedExpenses } = useQuery({
  queryKey: ['unmapped-expenses', legalEntityId],
  queryFn: async () => {
    const response = await fetch(
      `/api/accounting/unmapped-items?type=expense&legalEntityId=${legalEntityId}`
    );
    return response.json();
  }
});

// 2. Añadir la mutación para guardar
const saveExpenseMappings = useMutation({
  mutationFn: async (mappings: Record<string, string>) => {
    const response = await fetch('/api/accounting/expense-mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legalEntityId,
        systemId,
        mappings
      })
    });
    return response.json();
  }
});

// 3. Añadir la pestaña en el UI
<TabsTrigger value="expenses">
  <Wallet className="h-4 w-4" />
  Gastos
</TabsTrigger>
```

## Jerarquía de Mapeos

El sistema soporta diferentes niveles de especificidad:

1. **Nivel Categoría**: Mapeo general para todos los elementos de una categoría
2. **Nivel Elemento**: Mapeo específico para un servicio/producto individual
3. **Nivel Entidad Legal**: Diferentes mapeos por entidad legal

### Resolución de Mapeos

Al generar asientos contables, el sistema busca mapeos en este orden:

1. Mapeo específico del elemento (servicio/producto)
2. Mapeo de la categoría del elemento
3. Mapeo de la categoría padre (si existe)
4. Cuenta por defecto del tipo de elemento

## Mapeos Especiales: IVA

Los tipos de IVA requieren dos cuentas:
- **Cuenta de IVA Soportado** (compras)
- **Cuenta de IVA Repercutido** (ventas)

### Modelo Propuesto

```prisma
model VATTypeAccountMapping {
  id                String   @id @default(cuid())
  vatTypeId         String
  vatType           VATType  @relation(fields: [vatTypeId], references: [id])
  inputAccountId    String?  // Cuenta IVA Soportado
  inputAccount      ChartOfAccountEntry? @relation("VATInputAccount", fields: [inputAccountId], references: [id])
  outputAccountId   String?  // Cuenta IVA Repercutido
  outputAccount     ChartOfAccountEntry? @relation("VATOutputAccount", fields: [outputAccountId], references: [id])
  legalEntityId     String
  legalEntity       LegalEntity @relation(fields: [legalEntityId], references: [id])
  systemId          String
  system            System   @relation(fields: [systemId], references: [id])
  
  @@unique([vatTypeId, legalEntityId])
  @@map("vat_type_account_mappings")
}
```

## Integración con Asientos Contables

Al generar asientos contables automáticos:

```typescript
// services/accounting/JournalEntryService.ts
async function getAccountForCategory(
  categoryId: string,
  legalEntityId: string
): Promise<string | null> {
  // 1. Buscar mapeo directo
  const mapping = await prisma.categoryAccountMapping.findUnique({
    where: {
      categoryId_legalEntityId: {
        categoryId,
        legalEntityId
      }
    }
  });
  
  if (mapping) return mapping.accountId;
  
  // 2. Buscar en categoría padre
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { parent: true }
  });
  
  if (category?.parentId) {
    return getAccountForCategory(category.parentId, legalEntityId);
  }
  
  return null;
}
```

## Mejores Prácticas

1. **Validación**: Siempre validar que las cuentas existen y están activas
2. **Transacciones**: Usar transacciones para operaciones múltiples
3. **Auditoría**: Registrar quién y cuándo realizó los mapeos
4. **Caché**: Considerar cachear mapeos frecuentemente usados
5. **Migración**: Proporcionar herramientas para importar mapeos masivos

## Roadmap Futuro

1. **Reglas Automáticas**: Sistema de reglas para mapeo automático basado en:
   - Nombre de la cuenta
   - Tipo de elemento
   - Categoría
   - Otros criterios

2. **Plantillas de Mapeo**: Plantillas predefinidas por:
   - País
   - Sector (clínicas estéticas, peluquerías, etc.)
   - Normativa contable (IFRS, GAAP local)

3. **Validación Inteligente**: Sugerir cuentas basándose en:
   - Mapeos similares en otras entidades
   - Mejores prácticas contables
   - Requisitos legales del país

4. **API de Integración**: Permitir que sistemas externos configuren mapeos

## Conclusión

Esta arquitectura proporciona un sistema flexible y escalable para mapear cualquier entidad del sistema a cuentas contables, facilitando la generación automática de asientos contables y cumpliendo con los requisitos de múltiples jurisdicciones fiscales. 