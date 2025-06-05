# Propuesta de Evolución del Sistema de Plantillas Contables

## Resumen Ejecutivo

Este documento propone la evolución del sistema actual de plantillas contables hacia un **configurador integral del sistema** que automatice la configuración inicial completa, incluyendo categorías, métodos de pago, series contables y más, basándose en el tipo de negocio y sus características específicas.

## Problemas Actuales

1. **Estructura rígida de plantillas**: Las plantillas actuales mezclan tipos de negocio base con características opcionales
2. **Configuración manual extensa**: Después de aplicar una plantilla contable, el usuario debe configurar manualmente categorías, métodos de pago, series, etc.
3. **Falta de personalización**: No se adapta a múltiples ubicaciones o características específicas del negocio

## Propuesta de Nueva Estructura

### 1. Tipos de Centro Base (Núcleo)

En lugar de las plantillas actuales que mezclan conceptos, propongo estos tipos base:

1. **Centro Estético** - Servicios de belleza no médicos
2. **Clínica Médico-Estética** - Servicios médicos estéticos
3. **Centro de Bienestar** - Servicios de relajación y salud holística
4. **Centro Médico General** - Servicios médicos diversos
5. **Centro de Fisioterapia** - Rehabilitación y terapia física

### 2. Características Añadidas (Módulos)

Características que se pueden añadir a cualquier tipo base mediante checkboxes:

- ✅ **Peluquería**: Añade categorías y cuentas para servicios capilares
- ✅ **Spa/Hidroterapia**: Añade servicios de agua y termalismo
- ✅ **Tratamientos Médicos**: Habilita servicios médicos especializados
- ✅ **Fisioterapia**: Servicios de rehabilitación
- ✅ **Venta de Productos**: Activa gestión de inventario y ventas
- ✅ **Múltiples Delegaciones**: Configura estructura multi-ubicación

### 3. Configuración Automática Generada

Para cada combinación tipo base + características, el sistema generará:

#### A. Categorías de Servicios
```javascript
// Ejemplo: Centro Estético + Peluquería
{
  "Tratamientos Faciales": {
    subcategorías: ["Limpieza facial", "Peeling", "Hidratación"]
  },
  "Tratamientos Corporales": {
    subcategorías: ["Masajes", "Tratamientos reductores", "Exfoliación"]
  },
  "Servicios de Peluquería": {
    subcategorías: ["Corte", "Color", "Peinados", "Tratamientos capilares"]
  }
}
```

#### B. Familias de Productos
```javascript
{
  "Productos de Venta": {
    "Cosmética facial": ["Cremas", "Serums", "Mascarillas"],
    "Cosmética corporal": ["Aceites", "Cremas corporales"],
    "Productos capilares": ["Champús", "Acondicionadores", "Tratamientos"]
  },
  "Consumibles Internos": {
    "Material desechable": ["Guantes", "Gasas", "Toallas"],
    "Productos profesionales": ["Tintes", "Productos técnicos"]
  }
}
```

#### C. Métodos de Pago
```javascript
{
  "Estándar": ["Efectivo", "Tarjeta", "Transferencia"],
  "Especiales": ["Financiación", "Bonos regalo", "Pago aplazado"],
  "Digitales": ["Bizum", "PayPal"] // según país
}
```

#### D. Series Contables

**Sin delegaciones:**
- Tickets: `TICK-2025-00001`
- Facturas: `FACT-2025-00001`
- Abonos: `ABON-2025-00001`

**Con delegaciones (Madrid, Barcelona):**
- Tickets: `TICK-MAD-2025-00001`, `TICK-BCN-2025-00001`
- Facturas: `FACT-MAD-2025-00001`, `FACT-BCN-2025-00001`
- Abonos: `ABON-MAD-2025-00001`, `ABON-BCN-2025-00001`

## Interfaz de Usuario Propuesta

### Wizard de Configuración (3 pasos)

#### Paso 1: Tipo de Centro Base
```
¿Qué tipo de centro vas a gestionar?

○ Centro Estético (Tratamientos de belleza no médicos)
● Clínica Médico-Estética (Medicina estética)
○ Centro de Bienestar (Spa, masajes, terapias)
○ Centro Médico General
○ Centro de Fisioterapia
```

#### Paso 2: Características Adicionales
```
¿Qué servicios adicionales ofreces? (marca todos los que apliquen)

☑ Servicios de Peluquería
☐ Spa e Hidroterapia
☐ Tratamientos Médicos Especializados
☑ Venta de Productos al Público
☐ Gestión Multi-ubicación

¿Cuántas ubicaciones/delegaciones tienes? [2]
Nombres: [Madrid] [Barcelona] [+Añadir]
```

#### Paso 3: Configuración Avanzada
```
Personalización adicional:

Estrategia de productos:
● Venta y consumibles internos
○ Solo consumibles (no venta al público)

Métodos de pago especiales:
☑ Financiación
☑ Bonos regalo
☐ Domiciliación bancaria

Control de inventario:
● Estricto (stock en tiempo real)
○ Básico (sin alertas de stock)
```

## Estructura de Datos Propuesta

```typescript
interface ExpandedAccountingTemplate {
  // Existente
  chartOfAccounts: ChartOfAccountEntry[];
  vatTypes: VATTypeEntry[];
  
  // Nueva funcionalidad
  configuration: {
    baseType: BusinessBaseType;
    features: BusinessFeatures;
    locations?: LocationConfig[];
    productStrategy: ProductStrategy;
    paymentConfig: PaymentConfiguration;
    inventoryControl: 'STRICT' | 'BASIC';
  };
  
  // Datos generados automáticamente
  serviceCategories: CategoryTemplate[];
  productFamilies: ProductFamilyTemplate[];
  documentSeries: DocumentSeriesTemplate[];
  paymentMethods: PaymentMethodTemplate[];
  
  // Mapeos predefinidos
  defaultMappings: {
    categoryToAccount: Record<string, string>;
    paymentToAccount: Record<string, string>;
  };
}
```

## Plan de Implementación

### Fase 1: Refactorización de Plantillas Actuales
1. Separar tipos base de características añadidas
2. Crear sistema modular de combinación
3. Implementar generadores de configuración

### Fase 2: Actualización del Importador
1. Convertir selector simple en wizard de 3 pasos
2. Añadir vista previa completa de todo lo que se creará
3. Implementar aplicación atómica de toda la configuración

### Fase 3: Integración con Sistema Existente
1. Actualizar APIs para crear categorías, series, etc. en lote
2. Asegurar transaccionalidad (todo o nada)
3. Añadir capacidad de modificación post-importación

## Beneficios Esperados

1. **Reducción de tiempo de configuración**: De horas a minutos
2. **Mejores prácticas integradas**: Configuración óptima por defecto
3. **Flexibilidad total**: Todo personalizable después
4. **Experiencia de usuario mejorada**: Proceso guiado e intuitivo
5. **Escalabilidad**: Fácil añadir nuevos tipos y características

## Renombramiento de Plantillas Actuales

| Actual | Propuesto | Justificación |
|--------|-----------|---------------|
| aesthetic-clinic.ts | medical-aesthetic-base.ts | Es un tipo base, no una característica |
| beauty-center.ts | beauty-center-base.ts | Separar peluquería como característica |
| spa-wellness.ts | Eliminar | Spa es característica, wellness es tipo base |

## Nuevos Archivos Necesarios

```
/config/accounting/templates/
  /base-types/
    - beauty-center.ts
    - medical-aesthetic.ts
    - wellness-center.ts
    - medical-center.ts
    - physiotherapy.ts
  /features/
    - hair-salon.ts
    - spa-hydrotherapy.ts
    - medical-treatments.ts
    - product-sales.ts
  /generators/
    - category-generator.ts
    - series-generator.ts
    - payment-generator.ts
  /configurator/
    - template-configurator.ts
    - configuration-validator.ts
```

## Ejemplo de Uso Completo

**Usuario selecciona:**
- Tipo: Clínica Médico-Estética
- ✓ Spa e Hidroterapia
- ✓ Venta de Productos
- 2 ubicaciones: Madrid, Barcelona

**Sistema genera automáticamente:**

1. **Plan contable**: Adaptado para clínica médica + spa
2. **Categorías**:
   - Medicina Estética → Facial, Corporal, Inyectables
   - Spa → Circuitos, Masajes, Hidroterapia
3. **Productos**:
   - Venta → Cosmecéuticos, Protección solar
   - Consumibles → Material médico, Productos spa
4. **Series**:
   - TICK-MAD-2025, TICK-BCN-2025
   - FACT-MAD-2025, FACT-BCN-2025
5. **Métodos de pago**: Todos + Financiación médica
6. **Tipos IVA**: Estándar + Exento (servicios médicos)

Todo listo para empezar a trabajar inmediatamente.

## Conclusión

Esta evolución transformará el sistema de plantillas contables de una herramienta limitada a un **configurador integral del sistema** que reduce drásticamente el tiempo de puesta en marcha mientras mantiene la flexibilidad total para personalización posterior.
