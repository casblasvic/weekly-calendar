# Implementación de Plantillas Contables por Sector

## Resumen
Se ha implementado un sistema de plantillas contables por sector que permite personalizar el plan contable según el tipo de negocio (clínica estética, centro de belleza, spa, etc.) manteniendo la base del país seleccionado.

## Cambios Realizados

### 1. Tipos y Estructuras de Datos

#### `types/accounting.ts`
- Añadido enum `BusinessSector` con los tipos de negocio soportados:
  - `AESTHETIC_CLINIC`: Clínica estética
  - `BEAUTY_CENTER`: Centro de belleza y peluquería
  - `SPA_WELLNESS`: Spa y centro de bienestar
  - `MEDICAL_CENTER`: Centro médico privado (futuro)
  - `PHYSIOTHERAPY_CENTER`: Centro de fisioterapia (futuro)
  - `DENTAL_CLINIC`: Clínica dental (futuro)

- Añadida interfaz `SectorTemplate` para definir personalizaciones por sector:
  ```typescript
  interface SectorTemplate {
    sector: BusinessSector;
    names: MultiLanguageText;
    description: MultiLanguageText;
    accountCustomizations: {
      additionalAccounts?: ChartOfAccountTemplateEntry[];
      accountModifications?: Record<string, Partial<ChartOfAccountTemplateEntry>>;
      defaultMappings?: {
        services: Record<string, string>;
        products: Record<string, string>;
      };
    };
  }
  ```

### 2. Plantillas de Sectores

#### Estructura de carpetas:
```
config/accounting/templates/sectors/
├── index.ts                  # Exportaciones centrales
├── aesthetic-clinic.ts       # Plantilla para clínicas estéticas
├── beauty-center.ts         # Plantilla para centros de belleza
└── spa-wellness.ts          # Plantilla para spas
```

#### Características de cada plantilla:

**Clínica Estética (`aesthetic-clinic.ts`)**:
- Cuentas de ingresos específicas: tratamientos faciales, corporales, láser, antienvejecimiento
- Gastos: material inyectable, consumibles láser
- Activos: equipos láser, radiofrecuencia

**Centro de Belleza (`beauty-center.ts`)**:
- Ingresos: servicios peluquería, estética, bienestar, venta productos
- Gastos: productos capilares, material estética, productos reventa
- Activos: mobiliario peluquería, equipos estética

**Spa y Bienestar (`spa-wellness.ts`)**:
- Ingresos: tratamientos spa, terapias holísticas, masajes, programas bienestar
- Gastos: aceites esenciales, productos spa, material terapias
- Activos: instalaciones termales, equipamiento wellness

### 3. Componente AccountingTemplateImporter

Actualizado para incluir:
- Selector de sector de negocio después del país
- Vista previa jerárquica con expansión/colapso
- Validación de movimientos contables existentes
- Confirmación de riesgos al reemplazar con movimientos
- Soporte multi-idioma completo

### 4. APIs Actualizadas

#### `/api/chart-of-accounts/preview-template`
Nueva API que:
- Combina plantilla base del país con personalizaciones del sector
- Devuelve estructura completa para preview
- Ordena cuentas por número

#### `/api/chart-of-accounts/import-template`
Actualizada para:
- Aceptar parámetro `sector` opcional
- Combinar plantilla país + sector
- Aplicar modificaciones a cuentas existentes
- Crear cuentas adicionales del sector

### 5. Traducciones

Añadidas en `locales/[idioma].json`:
- Secciones de contabilidad con todas las etiquetas
- Descripciones de sectores
- Mensajes de validación y advertencia
- Tipos de cuenta contable

### 6. Base de Datos

#### Modelos en Prisma:
- Añadidos campos a `VATType`: `code`, `legalEntityId`
- Relaciones inversas completadas en todos los modelos contables
- Migración aplicada: `add_vat_type_code_and_legal_entity`

## Flujo de Uso

1. **Selección de Entidad Legal**: Usuario selecciona o crea una entidad legal
2. **Selección de País**: Define el plan contable base (España, Francia, Marruecos)
3. **Selección de Sector**: Opcional, personaliza según tipo de negocio
4. **Vista Previa**: Muestra estructura jerárquica expandible
5. **Modo de Importación**: Reemplazar o fusionar con existente
6. **Validaciones**:
   - Si hay movimientos contables, advertencia especial
   - Confirmación explícita para reemplazar con checkbox
7. **Importación**: Crea plan contable completo personalizado

## Características Destacadas

### Multi-idioma
- Todos los nombres de cuenta en ES/FR/EN
- Interfaz completamente traducida
- Sin árabe por ahora (usa español como fallback)

### Inteligencia del Sistema
- Detecta automáticamente el país de la entidad legal
- Valida existencia de plan contable previo
- Cuenta movimientos contables existentes
- Previene pérdida accidental de datos

### Personalización por Sector
- Añade cuentas específicas del negocio
- Modifica nombres de cuentas genéricas
- Prepara mapeos automáticos (para futura implementación)

## Trabajo Futuro

### Mapeo Automático de Categorías
Cuando se actualicen los modelos `ServiceAccountMapping` y `ProductAccountMapping`:
```typescript
// Añadir a los modelos:
serviceCategoryId?: string
productCategoryId?: string
```

Esto permitirá mapear automáticamente categorías de servicios/productos a cuentas contables.

### Sectores Adicionales
Los sectores MEDICAL_CENTER, PHYSIOTHERAPY_CENTER y DENTAL_CLINIC están preparados pero sin contenido específico aún.

### Importador Visual Universal
Plan para crear un importador CSV con mapeo visual de columnas que sirva para cualquier tipo de datos.

## Consideraciones Técnicas

### Rendimiento
- Las plantillas se cargan dinámicamente solo cuando se necesitan
- La vista previa usa estructura jerárquica eficiente
- Las operaciones de base de datos están optimizadas con transacciones

### Seguridad
- Validación de pertenencia sistema/entidad legal
- Autenticación requerida en todas las APIs
- Prevención de eliminación accidental con confirmaciones

### Mantenibilidad
- Estructura modular de plantillas
- Tipos TypeScript estrictos
- Documentación inline completa
- Separación clara de responsabilidades 