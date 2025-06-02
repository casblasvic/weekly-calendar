# Integración de Contabilidad Automática

## Resumen

El sistema de contabilidad automática genera asientos contables de forma automática cuando se realizan operaciones comerciales como ventas (tickets), cobros (pagos) y cierres de caja.

## Configuración Previa

Antes de que se generen asientos automáticos, cada clínica debe tener configurado:

1. **Entidad Legal**: La clínica debe estar asociada a una entidad legal
2. **Plan Contable**: Debe existir un plan de cuentas importado o creado manualmente
3. **Ejercicio Fiscal**: Debe haber al menos un ejercicio fiscal en estado OPEN
4. **Mapeos de Cuentas**:
   - Categorías de servicios/productos → Cuentas de ingresos
   - Métodos de pago → Cuentas de activo (caja, banco)
   - Tipos de IVA → Cuentas de IVA repercutido/soportado

## Uso del Hook de Integración

### 1. Importar el Hook

```typescript
import { useAccountingIntegration } from '@/hooks/useAccountingIntegration';
```

### 2. En Componente de Creación de Tickets

```typescript
// En tu componente de tickets
const { processTicketWithAccounting } = useAccountingIntegration();

// Después de crear exitosamente un ticket
const handleTicketCreation = async (ticketData: any) => {
  try {
    // 1. Crear el ticket
    const ticket = await createTicket(ticketData);
    
    // 2. Generar asiento contable si aplica
    if (ticket.id && clinic?.legalEntityId) {
      await processTicketWithAccounting(ticket.id, clinic.legalEntityId);
    }
    
    toast.success('Ticket creado exitosamente');
  } catch (error) {
    toast.error('Error al crear ticket');
  }
};
```

### 3. En Componente de Pagos

```typescript
// En tu componente de pagos
const { processPaymentWithAccounting } = useAccountingIntegration();

// Después de registrar un pago
const handlePaymentCreation = async (paymentData: any) => {
  try {
    // 1. Crear el pago
    const payment = await createPayment(paymentData);
    
    // 2. Generar asiento contable si es pago de deuda
    if (payment.id && payment.debtLedgerId && clinic?.legalEntityId) {
      await processPaymentWithAccounting(payment.id, clinic.legalEntityId);
    }
    
    toast.success('Pago registrado exitosamente');
  } catch (error) {
    toast.error('Error al registrar pago');
  }
};
```

### 4. En Componente de Cierre de Caja

```typescript
// En tu componente de cierre de caja
const { processCashSessionWithAccounting } = useAccountingIntegration();

// Al reconciliar una sesión de caja
const handleCashSessionReconciliation = async (sessionId: string) => {
  try {
    // 1. Reconciliar la sesión
    await reconcileCashSession(sessionId);
    
    // 2. Generar asiento de cierre
    if (clinic?.legalEntityId) {
      await processCashSessionWithAccounting(sessionId, clinic.legalEntityId);
    }
    
    toast.success('Caja reconciliada exitosamente');
  } catch (error) {
    toast.error('Error al reconciliar caja');
  }
};
```

## Estructura de Asientos Generados

### Asiento de Venta (Ticket)

```
DEBE                                    HABER
---------------------------------------------
Caja/Banco/Cliente     XXX.XX    |
                                  | Ventas Servicios    XXX.XX
                                  | IVA Repercutido     XXX.XX
```

### Asiento de Cobro de Deuda

```
DEBE                                    HABER
---------------------------------------------
Caja/Banco             XXX.XX    |
                                  | Clientes            XXX.XX
```

### Asiento de Cierre de Caja

```
DEBE                                    HABER
---------------------------------------------
Banco                  XXX.XX    |
                                  | Caja                XXX.XX
(Por retiros de efectivo)

Caja                   XXX.XX    |
                                  | Ingresos Diferencias XXX.XX
(Por sobrantes)

Gastos Diferencias     XXX.XX    |
                                  | Caja                XXX.XX
(Por faltantes)
```

## Verificación Manual

Para verificar que la generación automática está funcionando:

1. Ir a **Configuración → Contabilidad → Informes**
2. Seleccionar "Libro Diario" 
3. Elegir el período deseado
4. Exportar el informe

Los asientos generados automáticamente incluirán referencias a los documentos origen (ticket, pago, sesión de caja).

## Solución de Problemas

### No se generan asientos automáticos

1. Verificar que la clínica tenga entidad legal asignada
2. Verificar que exista un ejercicio fiscal abierto
3. Verificar que los mapeos estén configurados
4. Revisar la consola del navegador para mensajes de error

### Asientos incompletos

1. Verificar mapeo de categorías → cuentas de ingreso
2. Verificar mapeo de métodos de pago → cuentas de activo
3. Verificar que existan cuentas de IVA repercutido (477)
4. Verificar que existan cuentas de clientes (430)

## Consideraciones de Rendimiento

- La generación de asientos es asíncrona y no bloquea la operación principal
- Si falla la generación del asiento, la operación comercial continúa normalmente
- Los asientos se pueden regenerar manualmente desde el módulo de contabilidad

## Próximas Mejoras

1. **Validación de Ejercicio Fiscal**: Impedir crear documentos fuera del ejercicio activo
2. **Asientos de Compras**: Generar asientos para facturas de proveedores
3. **Asientos de Nómina**: Integración con el módulo de RRHH
4. **Conciliación Bancaria**: Matching automático de movimientos bancarios
5. **Asientos de Ajuste**: Interface para ajustes manuales y correcciones 