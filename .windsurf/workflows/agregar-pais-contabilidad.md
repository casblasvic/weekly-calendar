---
description: Cómo agregar soporte contable para un nuevo país
---

# Agregar soporte contable para un nuevo país

Este workflow documenta los pasos necesarios para agregar soporte contable para un nuevo país en el sistema.

## Pasos a seguir

### 1. Identificar las cuentas legales requeridas

Primero, obtener el plan contable oficial del país y identificar las cuentas principales:
- Cuenta de ventas de servicios
- Cuenta de ventas de productos  
- Cuenta de compras/consumibles
- Cuenta de caja
- Cuenta de bancos
- Cuenta de descuentos
- Cuenta de IVA soportado (compras)
- Cuenta de IVA repercutido (ventas)

### 2. Agregar las cuentas básicas al sistema

Editar el archivo `/config/accounting/basic-accounts.ts`:

```typescript
// Agregar nueva entrada para el país
BASIC_ACCOUNTS_BY_COUNTRY = {
  // ... países existentes ...
  
  // NUEVO PAÍS (ejemplo: Portugal)
  PT: [
    // INGRESOS
    { accountNumber: "71", name: "Vendas", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "72", name: "Prestações de serviços", type: "REVENUE", isMonetary: true, allowDirectEntry: true },
    
    // GASTOS
    { accountNumber: "61", name: "Custo das mercadorias vendidas", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "62", name: "Fornecimentos e serviços externos", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "663", name: "Descontos de pronto pagamento concedidos", type: "EXPENSE", isMonetary: true, allowDirectEntry: true },
    
    // CAJA Y BANCOS
    { accountNumber: "11", name: "Caixa", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    { accountNumber: "12", name: "Depósitos à ordem", type: "ASSET", isMonetary: true, allowDirectEntry: true },
    
    // IVA
    { accountNumber: "2432", name: "IVA dedutível", type: "ASSET", isMonetary: false, allowDirectEntry: false },
    { accountNumber: "2433", name: "IVA liquidado", type: "LIABILITY", isMonetary: false, allowDirectEntry: false },
    
    // ... más cuentas según necesidad ...
  ]
}
```

### 3. Configurar las cuentas fijas del país

Editar el archivo `/app/(main)/configuracion/contabilidad/lib/auto-account-mapping.ts`:

```typescript
export const FIXED_COUNTRY_ACCOUNTS = {
  // ... países existentes ...
  
  PT: {
    services: '72',         // Prestações de serviços
    products: '71',         // Vendas
    consumables: '61',      // Custo das mercadorias vendidas
    cash: '11',            // Caixa
    banks: '12',           // Depósitos à ordem
    discounts: '663',      // Descontos de pronto pagamento concedidos
    vatReceivable: '2432', // IVA dedutível
    vatPayable: '2433',    // IVA liquidado
  }
}
```

### 4. Agregar la plantilla del país

Editar el archivo `/config/accounting/index.ts`:

```typescript
export const COUNTRY_TEMPLATES: Record<string, any> = {
  // ... países existentes ...
  PT: BASIC_ACCOUNTS_BY_COUNTRY.PT
};
```

### 5. Verificar y probar

1. **Importar el plan contable del nuevo país**:
   - Ir a Configuración > Contabilidad
   - Seleccionar el nuevo país
   - Importar plantilla

2. **Verificar las cuentas**:
   - Confirmar que todas las cuentas definidas en FIXED_COUNTRY_ACCOUNTS existen
   - Si falta alguna, agregarla a BASIC_ACCOUNTS_BY_COUNTRY

3. **Ejecutar mapeo automático**:
   - Ir a la pestaña Mapeo
   - Hacer clic en "Aplicar mapeo automático"
   - Verificar que no hay errores de cuentas faltantes

### 6. Consideraciones especiales

- **Estructura del número de cuenta**: Algunos países usan números largos (ej: Francia con 5-6 dígitos), otros usan números cortos (ej: España con 3 dígitos)
- **Tipos de IVA**: Verificar si el país tiene regímenes especiales de IVA
- **Cuentas adicionales**: Algunos países pueden requerir cuentas específicas para retenciones, impuestos locales, etc.

### 7. Documentación

Actualizar la documentación del sistema incluyendo:
- Países soportados
- Particularidades del plan contable del nuevo país
- Cualquier consideración especial para ese país

## Ejemplo completo: Agregar Portugal

```bash
# 1. Editar basic-accounts.ts y agregar las cuentas de Portugal
# 2. Editar auto-account-mapping.ts y agregar PT a FIXED_COUNTRY_ACCOUNTS
# 3. Editar index.ts y agregar PT a COUNTRY_TEMPLATES
# 4. Probar la importación y mapeo
```

## Validación final

Antes de considerar completo el soporte para el nuevo país:
- [ ] Todas las cuentas requeridas están definidas
- [ ] El mapeo automático funciona sin errores
- [ ] Se pueden crear subcuentas correctamente
- [ ] Los asientos contables se generan con las cuentas correctas
- [ ] La documentación está actualizada
