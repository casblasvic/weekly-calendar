# Validación de Ejercicio Fiscal

## Resumen

El sistema valida automáticamente que todas las operaciones contables se realicen dentro del ejercicio fiscal activo, impidiendo la creación de documentos con fechas fuera del período configurado.

## Uso del Hook de Validación

### 1. Importar el Hook

```typescript
import { useFiscalYearValidation } from '@/hooks/useFiscalYearValidation';
```

### 2. En Componente de Creación de Tickets

```typescript
export function TicketForm({ clinic }: { clinic: Clinic }) {
  const { validateWithToast, getFiscalYearBounds } = useFiscalYearValidation(
    clinic?.legalEntityId
  );
  
  const [ticketDate, setTicketDate] = useState(new Date());
  
  // Obtener límites del ejercicio fiscal
  const fiscalBounds = getFiscalYearBounds();
  
  const handleSubmit = async (data: TicketData) => {
    // Validar fecha antes de procesar
    if (!validateWithToast(ticketDate)) {
      return; // No continuar si la fecha es inválida
    }
    
    // Proceder con la creación del ticket
    await createTicket({ ...data, date: ticketDate });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="date"
        value={ticketDate}
        onChange={(e) => setTicketDate(e.target.value)}
        min={fiscalBounds?.min}
        max={fiscalBounds?.max}
      />
      {/* ... resto del formulario ... */}
    </form>
  );
}
```

### 3. En Componente de Pagos

```typescript
export function PaymentForm({ clinic }: { clinic: Clinic }) {
  const { 
    validateCurrentDate,
    hasActiveFiscalYear 
  } = useFiscalYearValidation(clinic?.legalEntityId);
  
  // Deshabilitar el formulario si no hay ejercicio fiscal activo
  if (!hasActiveFiscalYear) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay ejercicio fiscal activo. Configure uno en 
          Configuración → Contabilidad → Ejercicios.
        </AlertDescription>
      </Alert>
    );
  }
  
  const handlePayment = async (paymentData: PaymentData) => {
    const validation = validateCurrentDate();
    
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }
    
    // Proceder con el pago
    await processPayment(paymentData);
  };
  
  return (
    // ... formulario de pago ...
  );
}
```

### 4. En Componente de Cierre de Caja

```typescript
export function CashSessionClose({ session, clinic }: Props) {
  const { activeFiscalYear, validateDate } = useFiscalYearValidation(
    clinic?.legalEntityId
  );
  
  const handleClose = async () => {
    // Validar que la sesión esté dentro del ejercicio fiscal
    const validation = validateDate(session.openTime);
    
    if (!validation.isValid) {
      toast.error(
        `Esta sesión de caja pertenece a un ejercicio fiscal diferente. 
        ${validation.message}`
      );
      return;
    }
    
    // Proceder con el cierre
    await closeCashSession(session.id);
  };
  
  return (
    <div>
      {activeFiscalYear && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Ejercicio Fiscal: {activeFiscalYear.name}
          </AlertDescription>
        </Alert>
      )}
      <Button onClick={handleClose}>
        Cerrar Sesión de Caja
      </Button>
    </div>
  );
}
```

## Validación en el Backend

Para una seguridad completa, también se debe validar en el backend:

```typescript
// En API de tickets
export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // Obtener ejercicio fiscal activo
  const activeFiscalYear = await prisma.fiscalYear.findFirst({
    where: {
      legalEntityId: data.clinic.legalEntityId,
      status: 'OPEN',
      startDate: { lte: new Date(data.date) },
      endDate: { gte: new Date(data.date) }
    }
  });
  
  if (!activeFiscalYear) {
    return NextResponse.json(
      { error: 'La fecha del ticket no está dentro de un ejercicio fiscal activo' },
      { status: 400 }
    );
  }
  
  // Continuar con la creación del ticket
  const ticket = await prisma.ticket.create({
    data: {
      ...data,
      fiscalYearId: activeFiscalYear.id // Asociar al ejercicio fiscal
    }
  });
  
  return NextResponse.json(ticket);
}
```

## Componentes Afectados

Los siguientes componentes deben implementar la validación:

1. **Creación de Tickets**: Validar fecha de emisión
2. **Registro de Pagos**: Validar fecha de pago
3. **Cierre de Caja**: Validar que la sesión pertenezca al ejercicio actual
4. **Notas de Crédito**: Validar fecha de emisión
5. **Facturas**: Validar fecha de facturación
6. **Asientos Manuales**: Validar fecha del asiento

## Mensajes de Error

El sistema mostrará mensajes claros cuando:

- No existe ejercicio fiscal activo
- La fecha está fuera del rango del ejercicio
- Se intenta modificar documentos de ejercicios cerrados

## Consideraciones Especiales

1. **Múltiples Ejercicios**: Si hay varios ejercicios abiertos, se usa el más reciente
2. **Sin Entidad Legal**: Si la clínica no tiene entidad legal, no se aplica validación
3. **Ejercicios en Cierre**: Se permite crear documentos en ejercicios en proceso de cierre
4. **Retroactividad**: No se permiten documentos con fechas anteriores al ejercicio activo 