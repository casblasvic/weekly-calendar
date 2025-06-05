# Configurador de Plantillas Contables de Máximos

## Concepto

El nuevo sistema de configuración contable "de máximos" crea una plantilla completa que cubre TODAS las situaciones posibles para un país, eliminando la necesidad de configuración inicial compleja.

## Ventajas del Enfoque de Máximos

1. **Sin configuración inicial**: El usuario importa el plan y ya está todo listo
2. **Preparado para todo**:
   - Si contratan empleados → cuentas de nóminas ya mapeadas
   - Si activan amortizaciones → cuentas ya disponibles
   - Si usan cualquier método de pago → ya está mapeado
   - Si abren múltiples centros → estructura lista
3. **Sin sorpresas**: Todo está preconfigurado, solo hay que usar lo que se necesite
4. **Más eficiente**: Una sola importación vs múltiples configuraciones

## Componentes Incluidos

### 1. Cuentas Contables
- **Personal**: 640 (Sueldos), 642 (SS empresa), 465 (Remuneraciones pendientes), 476 (SS acreedora)
- **Amortizaciones**: 280/281 (Amortización acumulada), 681 (Dotación amortización)
- **Inventario**: 300 (Mercaderías), 600 (Compras), 700 (Ventas), 610 (Variación existencias)
- **Servicios**: 705 (Prestación de servicios)
- **Pagos aplazados**: 431 (Efectos comerciales), 436 (Clientes dudoso cobro), 650 (Pérdidas incobrables)
- **Proveedores**: 400 (Proveedores), 410 (Acreedores)
- **Gastos diversos**: 621-629 (Todos los gastos operativos)
- **Multicentro**: Subcuentas por ubicación (ej: 570001, 570002 para cajas por centro)

### 2. Métodos de Pago (TODOS)
- Efectivo (CASH) → 570
- Tarjeta (CARD) → 572 + comisiones 669
- Transferencia (BANK_TRANSFER) → 572
- Pasarela Online (ONLINE_GATEWAY) → 572
- Cheque (CHECK) → 572
- Crédito Interno (INTERNAL_CREDIT) → 438
- Pago Aplazado (DEFERRED_PAYMENT) → 430
- Domiciliación (DIRECT_DEBIT) → 572
- Financiación (FINANCING) → 523

### 3. Categorías de Servicios
- Consultas
- Tratamientos Médicos
- Estética
- Peluquería
- Spa y Bienestar
- Fisioterapia
- Servicios Generales

### 4. Familias de Productos
**Para venta:**
- Cosmética
- Farmacia
- Suplementos
- Accesorios

**Consumibles:**
- Material Médico
- Productos Capilares
- Material de Tratamiento
- Material General

### 5. Series de Documentos
- Tickets (T)
- Recibos (R)
- Facturas (FC2024)
- Facturas Simplificadas (FS2024)
- Abonos (AB2024)
- Rectificativas (FR2024)
- Presupuestos (P)
- Vales (V)
- Órdenes de Trabajo (OT)
- Albaranes (ALB)
- Series adicionales para multicentro

## Uso en la API

```typescript
// Ejemplo de importación con configuración de máximos
const response = await fetch('/api/chart-of-accounts/import-template', {
  method: 'POST',
  body: JSON.stringify({
    templateCode: 'IFRS_ES',
    country: 'ES',
    systemId: 'sistema-123',
    legalEntityId: 'entidad-456',
    mode: 'replace',
    // Ya no necesitamos especificar características del negocio
    // Todo se crea por defecto
    businessFeatures: {
      // Estas características ya no afectan la generación
      // Se mantienen por compatibilidad pero se ignoran
      hasConsultationServices: true,
      hasMedicalTreatments: true,
      hasHairSalon: true,
      hasSpa: true,
      sellsProducts: true,
      isMultiCenter: true
    }
  })
});
```

## Filosofía

> "Es mejor tener y no necesitar, que necesitar y no tener"

Esta aproximación elimina la fricción inicial y permite que los usuarios empiecen a trabajar inmediatamente con un sistema completamente configurado. Luego pueden desactivar o personalizar lo que no necesiten.

## Migración desde el Sistema Anterior

El sistema es compatible hacia atrás. Las llamadas existentes que especifican características del negocio seguirán funcionando, pero ahora siempre recibirán la configuración completa independientemente de las características especificadas.

## Personalización Post-Importación

Después de importar la configuración de máximos, los usuarios pueden:
1. Desactivar métodos de pago que no usen
2. Ocultar categorías de servicios no relevantes
3. Marcar como inactivas las familias de productos no utilizadas
4. Personalizar los prefijos de las series de documentos
5. Ajustar los mapeos contables según sus necesidades específicas

## Resultado Final

Un sistema listo para usar desde el primer momento, preparado para cualquier escenario empresarial, sin necesidad de configuración inicial compleja.
