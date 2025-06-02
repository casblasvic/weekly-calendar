# Sistema de Contabilidad Internacional

## Resumen Ejecutivo

Este documento describe la implementación del sistema de contabilidad internacional para el SaaS de gestión de clínicas estéticas y centros de belleza. El sistema permite la gestión contable multi-país con soporte para España, Francia y Marruecos.

## Arquitectura del Sistema

### Niveles de Configuración

1. **Nivel 1 - IFRS (Internacional)**
   - Plantilla base con estándar IFRS
   - Multi-idioma (ES, FR, EN, AR)
   - Adaptada al sector de clínicas estéticas

2. **Nivel 2 - GAAP País**
   - Plantillas específicas por país:
     - España: PGC (Plan General Contable)
     - Francia: PCG (Plan Comptable Général)
     - Marruecos: CGNC (Code Général de la Normalisation Comptable)

3. **Nivel 3 - Configuración Fiscal**
   - Tasas de IVA/TVA por país
   - Exenciones específicas del sector médico
   - Regímenes especiales (Canarias, DOM-TOM, etc.)

4. **Nivel 4 - Personalización por Tenant**
   - Activación/desactivación de cuentas
   - Alias personalizados
   - Configuración por sociedad fiscal

## Estructura de Archivos

```
config/
├── accounting/
│   ├── templates/
│   │   ├── base/
│   │   │   └── ifrs-clinic.ts         # Plantilla IFRS base
│   │   └── countries/
│   │       ├── MA/
│   │       │   └── pcg-morocco-clinic.ts
│   │       ├── FR/
│   │       │   └── pcg-france-clinic.ts
│   │       └── ES/
│   │           └── pgc-spain-clinic.ts
│   ├── vat/
│   │   ├── morocco-vat.ts              # Configuración TVA Marruecos
│   │   ├── france-vat.ts               # Configuración TVA Francia
│   │   └── spain-vat.ts                # Configuración IVA España
│   └── index.ts                        # Exportaciones centralizadas

components/
├── accounting/
│   └── template-importer/
│       └── AccountingTemplateImporter.tsx  # Componente de importación

app/
├── (main)/
│   └── configuracion/
│       └── importar-datos/
│           └── contabilidad/
│               └── page.tsx            # Página mejorada con tabs
└── api/
    └── chart-of-accounts/
        ├── route.ts                    # API verificación
        └── import-template/
            └── route.ts                # API importación
```

## Características Principales

### 1. Multi-idioma
- Soporte completo para ES, FR, EN, AR
- Nombres de cuentas traducidos
- Descripciones en idioma local

### 2. Mapeo Automático IFRS → Local
- Conversión automática de códigos IFRS a códigos locales
- Mantenimiento de trazabilidad

### 3. Integración con Servicios y Productos
- Mapeo automático por categorías
- Cuentas predefinidas para el sector

### 4. Gestión de IVA/TVA
- Tasas específicas por país
- Exenciones médicas configuradas
- Soporte para regímenes especiales

## Uso del Sistema

### Importación de Plantillas

1. **Acceder al importador**
   ```
   /configuracion/importar-datos/contabilidad
   ```

2. **Seleccionar método**
   - Tab "Plantillas Predefinidas": Para usar plantillas del sistema
   - Tab "Importar CSV": Para planes personalizados

3. **Configurar importación**
   - Seleccionar sociedad fiscal
   - Elegir país y plantilla
   - Decidir modo (reemplazar o fusionar)

### Plantillas Disponibles

#### IFRS Base
- 50+ cuentas predefinidas
- Estructura completa para clínicas
- Base para adaptaciones locales

#### Marruecos (PCG)
- Adaptación al CGNC marroquí
- TVA con tasas 20%, 14%, 10%, 7%
- Cuentas en francés y árabe

#### Francia (PCG)
- Compatible con PCG 2014
- TVA con tasas 20%, 10%, 5.5%, 2.1%
- Soporte DOM-TOM y Córcega

#### España (PGC)
- Basado en RD 1514/2007
- IVA 21%, 10%, 4%
- Soporte IGIC (Canarias) e IPSI

## Configuración de IVA/TVA

### Categorías de IVA

- `VAT_STANDARD`: Tipo general
- `VAT_REDUCED`: Tipo reducido
- `VAT_SUPER_REDUCED`: Tipo super-reducido
- `VAT_EXEMPT`: Exento
- `VAT_MEDICAL_EXEMPT`: Exento servicios médicos

### Aplicación Automática

El sistema aplica automáticamente el IVA correcto basándose en:
- Tipo de servicio/producto
- País de la sociedad fiscal
- Exenciones configuradas

## Integración Contable

### Con Tickets y Facturas
- Generación automática de asientos
- Cuentas de cliente/proveedor
- Control de IVA repercutido/soportado

### Con Métodos de Pago
- Cuentas de caja y bancos
- Conciliación automática
- Control por terminal POS

### Con Inventarios
- Cuentas de existencias
- Variación de existencias
- Consumos automáticos

## Mantenimiento y Extensión

### Añadir Nuevo País

1. Crear plantilla en `config/accounting/templates/countries/[ISO]/`
2. Definir configuración IVA en `config/accounting/vat/`
3. Actualizar `SUPPORTED_COUNTRIES` en `index.ts`
4. Añadir información en `COUNTRY_INFO`

### Personalizar Plantillas

Las plantillas pueden personalizarse mediante:
- Herencia de plantilla base
- Sobrescritura de cuentas específicas
- Adición de cuentas locales

## Consideraciones de Seguridad

- Validación de permisos por sistema/tenant
- Restricción de modificación de plantillas sistema
- Auditoría de cambios en plan contable
- Backup antes de importaciones masivas

## Próximos Pasos

1. **Emisión de Facturas**
   - Integración con series documentales
   - Generación de asientos automáticos
   - Cumplimiento fiscal por país

2. **Control de Gastos**
   - Módulo de compras
   - Recepción de facturas
   - Conciliación con proveedores

3. **Reporting Fiscal**
   - Exportadores SII (España)
   - FEC (Francia)
   - Declaraciones locales

4. **Consolidación**
   - Reportes multi-sociedad
   - Conversión de moneda
   - Eliminaciones intercompañía 