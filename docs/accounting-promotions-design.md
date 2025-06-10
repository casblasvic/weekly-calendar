# Diseño de Mapeo Contable para Promociones

## Arquitectura Propuesta

### 1. Estructura de Cuentas
```
7129 (Descuentos y Promociones)
  ├── 7129.MANUAL (Descuentos Manuales - Global)
  │   ├── 7129.MANUAL.CAFC (Descuentos Manuales - Clínica CAFC)
  │   │   ├── 7129.MANUAL.CAFC.001 (Black Friday 2024)
  │   │   ├── 7129.MANUAL.CAFC.002 (Descuento Empleados 15%)
  │   │   └── 7129.MANUAL.CAFC.003 (Descuento Primera Visita)
  │   └── 7129.MANUAL.CMO (Descuentos Manuales - Clínica CMO)
  │       └── 7129.MANUAL.CMO.001 (Descuento Convenio Empresa X)
  │
  └── 7129.2X1 (Promociones 2x1 - Global)
      └── 7129.2X1.CAFC (Promociones 2x1 - Clínica CAFC)
          ├── 7129.2X1.CAFC.001 (2x1 Blanqueamiento Verano)
          └── 7129.2X1.CAFC.002 (2x1 Limpieza Dental)
```

### 2. Niveles de Análisis

#### Nivel 1: Análisis Global
- Total descuentos aplicados
- Impacto en margen bruto

#### Nivel 2: Análisis por Tipo
- Efectividad de descuentos manuales vs 2x1 vs puntos
- ROI por tipo de promoción

#### Nivel 3: Análisis por Clínica
- Comparativa entre clínicas
- Identificar mejores prácticas

#### Nivel 4: Análisis por Promoción Individual
- **Black Friday 2024**: 
  - Ingresos perdidos: 15,000€
  - Nuevos clientes captados: 45
  - Valor vida cliente (CLV): 1,200€
  - ROI: 360%
- **2x1 Blanqueamiento**:
  - Ingresos perdidos: 8,000€
  - Cross-selling generado: 12,000€
  - ROI: 150%

### 3. Beneficios para Cuadros de Mando

1. **Análisis de Rentabilidad**
   - ROI por promoción específica
   - Comparativa histórica
   - Identificar promociones no rentables

2. **Análisis de Comportamiento**
   - Qué promociones atraen más clientes nuevos
   - Qué promociones generan más recurrencia
   - Estacionalidad por promoción

3. **Optimización de Estrategia**
   - A/B testing contable de promociones
   - Decisiones basadas en datos reales
   - Ajuste de estrategias por clínica

### 4. Implementación Técnica

```typescript
// Modelo de mapeo propuesto
model PromotionAccountMapping {
  id            String   @id @default(cuid())
  promotionId   String   @unique  // Mapeo 1:1 con promoción
  promotion     Promotion @relation(fields: [promotionId], references: [id])
  accountId     String
  account       ChartOfAccountEntry @relation(fields: [accountId], references: [id])
  legalEntityId String
  clinicId      String
  
  // Metadatos para análisis
  targetRevenue     Decimal?  // Objetivo de ingresos
  targetNewClients  Int?      // Objetivo nuevos clientes
  budgetedDiscount  Decimal?  // Descuento presupuestado
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([promotionId])
  @@index([accountId])
  @@index([clinicId])
}
```

### 5. Flujo de Creación

1. **Crear promoción** → Auto-crear subcuenta
2. **Patrón numeración**: `{tipo}.{clínica}.{secuencial}`
3. **Herencia**: Si no tiene mapeo específico, hereda del tipo

### 6. Reportes Sugeridos

1. **Dashboard Promociones**
   - Top 10 promociones por ROI
   - Promociones activas vs objetivo
   - Tendencia mensual por tipo

2. **Análisis Comparativo**
   - Promoción vs presupuesto
   - Clínica vs clínica
   - Año vs año

3. **Alertas Automáticas**
   - Promoción con ROI negativo
   - Promoción superando presupuesto
   - Promoción sin uso en 30 días

### 7. Consideraciones

- **Complejidad**: Más cuentas, pero información valiosa
- **Migración**: Mantener compatibilidad con sistema actual
- **Permisos**: Control granular por promoción
- **Archivado**: Promociones antiguas → cuentas inactivas
