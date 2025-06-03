# Códigos de Razón - Sistema Contable

## 📋 Códigos cuando no hay datos disponibles

### Códigos Generales
- `legal_entity_not_found`: "La sociedad fiscal seleccionada no existe"
- `no_clinics_assigned`: "Esta sociedad fiscal no tiene clínicas asignadas. Configure al menos una clínica para poder mapear elementos contables."

### Categorías (`category`)
- `no_categories_in_tariffs`: "No hay categorías con servicios o productos definidos en las tarifas de esta sociedad fiscal"
- `all_categories_mapped`: "Todas las categorías están correctamente mapeadas"

### Métodos de Pago (`payment`)
- `no_payment_methods_configured`: "No hay métodos de pago configurados en las clínicas de esta sociedad fiscal"
- `no_active_payment_methods`: "Los métodos de pago configurados están desactivados"
- `all_payment_methods_mapped`: "Todos los métodos de pago están correctamente mapeados"

### Tipos de IVA (`vat`)
- `no_tariffs_found`: "No se encontraron tarifas asociadas a las clínicas de esta sociedad fiscal"
- `no_vat_types_in_tariffs`: "No hay tipos de IVA definidos en las tarifas de esta sociedad fiscal"
- `all_vat_types_mapped`: "Todos los tipos de IVA están correctamente mapeados"

### Tipos de Gastos (`expense`)
- `no_expense_types_defined`: "No hay tipos de gastos definidos en el sistema"
- `all_expense_types_mapped`: "Todos los tipos de gastos están correctamente mapeados"

### Cajas/Terminales (`cash-session`)
- `no_cash_entities_to_map`: "No hay clínicas ni terminales POS para mapear en esta sociedad fiscal"
- `all_cash_entities_mapped`: "Todas las cajas y terminales están correctamente mapeadas"

### Descuentos/Promociones (`discount`)
- `no_promotions_available`: "No hay promociones disponibles para esta sociedad fiscal. Las promociones pueden ser globales o específicas de las clínicas asignadas."
- `all_promotions_mapped`: "Todas las promociones están correctamente mapeadas"

## 🔗 Relaciones Jerárquicas

### Estructura Obligatoria
Para que una sociedad fiscal tenga elementos que mapear, debe cumplir:

1. **LegalEntity** → Debe tener **Clinics** asignadas
2. **Clinic** → Debe tener **Tariff** asignada (obligatorio)
3. **Tariff** → Debe tener elementos con precios definidos:
   - Servicios con `TariffServicePrice`
   - Productos con `TariffProductPrice`
   - Bonos con `TariffBonoPrice`
   - Paquetes con `TariffPackagePrice`

### Métodos de Pago
- Se configuran vía `ClinicPaymentSetting`
- Relacionan `Clinic` + `PaymentMethodDefinition`
- Solo aparecen si están `isActive: true`

### Tipos de IVA
- **De tarifas**: `Tariff.vatTypeId` (obligatorio)
- **De precios específicos**: `TariffServicePrice.vatTypeId`, `TariffProductPrice.vatTypeId`
- **Específicos de entidad**: `VATType.legalEntityId`

### Promociones
- **Globales**: Sin `PromotionClinicScope` (aplican a todos)
- **Específicas**: Con `PromotionClinicScope` para clínicas de la entidad
- Solo las que tienen `code` se pueden mapear contablemente

## ⚠️ Casos Especiales

### Sin Clínicas Asignadas
Si una `LegalEntity` no tiene clínicas:
- No puede tener categorías, servicios, productos, IVA
- No puede tener métodos de pago configurados
- No puede tener cajas/terminales
- Solo puede tener tipos de gastos (globales del sistema)

### Tarifas Sin Elementos
Si las tarifas no tienen precios definidos:
- Las categorías no aparecerán (sin servicios/productos activos)
- Los tipos de IVA se limitarán al IVA base de la tarifa

### Promociones Sin Código
Las promociones sin `code` no se pueden mapear contablemente porque no generan tipos de descuento identificables. 