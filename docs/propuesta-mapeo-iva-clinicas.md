# Propuesta: Mapeo de Tipos de IVA por Clínica

## Contexto
Dado que las clínicas son las unidades de negocio que facturan de forma independiente, es necesario implementar un sistema de mapeo de tipos de IVA similar al de promociones, donde cada clínica pueda tener sus propias configuraciones contables para IVA.

## Estructura Propuesta

### 1. Modelo de Datos

```prisma
// Añadir a schema.prisma
model VatTypeAccountMapping {
  id              String              @id @default(cuid())
  vatTypeId       String
  clinicId        String?             // null = mapeo global
  legalEntityId   String
  inputAccountId  String?             // Cuenta IVA soportado
  outputAccountId String?             // Cuenta IVA repercutido
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  
  vatType         VatType             @relation(fields: [vatTypeId], references: [id])
  clinic          Clinic?             @relation(fields: [clinicId], references: [id])
  legalEntity     LegalEntity         @relation(fields: [legalEntityId], references: [id])
  inputAccount    ChartOfAccountEntry? @relation("VatInputAccount", fields: [inputAccountId], references: [id])
  outputAccount   ChartOfAccountEntry? @relation("VatOutputAccount", fields: [outputAccountId], references: [id])
  
  @@unique([vatTypeId, clinicId, legalEntityId])
  @@index([clinicId])
  @@index([legalEntityId])
}
```

### 2. API Endpoint

```typescript
// /api/accounting/all-vat-types-with-mappings/route.ts
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const systemId = searchParams.get('systemId');
  const legalEntityId = searchParams.get('legalEntityId');

  // Obtener todas las clínicas
  const clinics = await db.clinic.findMany({
    where: { systemId },
    select: {
      id: true,
      name: true,
      code: true
    }
  });

  // Obtener todos los tipos de IVA
  const vatTypes = await db.vatType.findMany({
    where: { systemId },
    include: {
      accountMappings: {
        where: { legalEntityId },
        include: {
          inputAccount: true,
          outputAccount: true
        }
      }
    }
  });

  // Estructurar respuesta por clínica
  const clinicsWithVatTypes = clinics.map(clinic => {
    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      clinicCode: clinic.code,
      vatTypes: vatTypes.map(vatType => {
        // Buscar mapeo específico de clínica
        const clinicMapping = vatType.accountMappings.find(m => m.clinicId === clinic.id);
        // Buscar mapeo global
        const globalMapping = vatType.accountMappings.find(m => !m.clinicId);
        
        // Usar mapeo de clínica si existe, sino usar global
        const mapping = clinicMapping || globalMapping;
        
        return {
          id: vatType.id,
          name: vatType.name,
          code: vatType.code,
          rate: vatType.rate,
          isDefault: vatType.isDefault,
          // Mapeo de IVA soportado
          inputAccountId: mapping?.inputAccountId || null,
          inputAccountCode: mapping?.inputAccount?.accountNumber || null,
          inputAccountName: mapping?.inputAccount?.name || null,
          // Mapeo de IVA repercutido
          outputAccountId: mapping?.outputAccountId || null,
          outputAccountCode: mapping?.outputAccount?.accountNumber || null,
          outputAccountName: mapping?.outputAccount?.name || null,
          // Indicadores
          hasClinicMapping: !!clinicMapping,
          hasGlobalMapping: !!globalMapping,
          isInherited: !clinicMapping && !!globalMapping
        };
      })
    };
  });

  return NextResponse.json(clinicsWithVatTypes);
}
```

### 3. Componente Frontend

```typescript
// Actualizar AccountingMappingConfigurator.tsx

// Estado para mapeos de IVA por clínica
const [vatMappingsByClinic, setVatMappingsByClinic] = useState<{
  [key: string]: { input?: string; output?: string }
}>({});

// Función para guardar mapeos
const handleSaveVatMappings = () => {
  const mappingsToSave: any[] = [];
  
  Object.entries(vatMappingsByClinic).forEach(([key, mapping]) => {
    const [clinicId, vatTypeId] = key.split(':');
    
    if (mapping.input && mapping.input !== 'none') {
      mappingsToSave.push({
        vatTypeId,
        clinicId,
        inputAccountId: mapping.input,
        outputAccountId: mapping.output !== 'none' ? mapping.output : null
      });
    }
  });
  
  saveVatMappings.mutate(mappingsToSave);
};

// UI con acordeón por clínica
<Accordion type="single" collapsible className="w-full">
  {clinicsWithVatTypes?.map((clinic) => (
    <AccordionItem key={clinic.clinicId} value={clinic.clinicId}>
      <AccordionTrigger>
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{clinic.clinicName}</span>
          <Badge variant="outline" className="ml-2">
            {clinic.clinicCode}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-4">
          {clinic.vatTypes.map((vatType) => (
            <div key={vatType.id} className="border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">{vatType.name}</h4>
                  <div className="text-sm text-muted-foreground">
                    Tasa: {vatType.rate}%
                  </div>
                  {vatType.isInherited && (
                    <Badge variant="secondary" className="mt-2">
                      Heredado de configuración global
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3">
                  {/* IVA Soportado */}
                  <div>
                    <Label>IVA Soportado (Compras)</Label>
                    <Select
                      value={vatMappingsByClinic[`${clinic.clinicId}:${vatType.id}`]?.input || vatType.inputAccountId || 'none'}
                      onValueChange={(value) => 
                        setVatMappingsByClinic(prev => ({
                          ...prev,
                          [`${clinic.clinicId}:${vatType.id}`]: {
                            ...prev[`${clinic.clinicId}:${vatType.id}`],
                            input: value
                          }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {/* Cuentas de IVA soportado */}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* IVA Repercutido */}
                  <div>
                    <Label>IVA Repercutido (Ventas)</Label>
                    <Select
                      value={vatMappingsByClinic[`${clinic.clinicId}:${vatType.id}`]?.output || vatType.outputAccountId || 'none'}
                      onValueChange={(value) => 
                        setVatMappingsByClinic(prev => ({
                          ...prev,
                          [`${clinic.clinicId}:${vatType.id}`]: {
                            ...prev[`${clinic.clinicId}:${vatType.id}`],
                            output: value
                          }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {/* Cuentas de IVA repercutido */}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

### 4. Ventajas de esta implementación

1. **Flexibilidad por clínica**: Cada clínica puede tener sus propias cuentas de IVA
2. **Herencia de configuración global**: Si no hay mapeo específico, usa el global
3. **Separación IVA soportado/repercutido**: Permite configurar ambos tipos independientemente
4. **Consistencia con promociones**: Sigue el mismo patrón ya implementado
5. **Trazabilidad**: Se puede ver claramente qué configuración está usando cada clínica

### 5. Casos de uso

- **Clínicas en diferentes países**: Pueden tener cuentas de IVA diferentes según normativa local
- **Clínicas con regímenes especiales**: Algunas pueden estar exentas o tener tipos reducidos
- **Consolidación contable**: La empresa matriz puede ver todos los mapeos de forma centralizada

### 6. Próximos pasos

1. Crear las migraciones de base de datos
2. Implementar el endpoint API
3. Actualizar el componente frontend
4. Añadir validaciones y tests
5. Documentar el proceso de configuración
