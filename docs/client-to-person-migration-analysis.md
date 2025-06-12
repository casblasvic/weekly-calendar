# Análisis Detallado: Migración de Client a Person

## 🎯 Objetivo
Migrar el modelo `Client` al nuevo modelo unificado `Person` sin romper la funcionalidad existente, manteniendo total compatibilidad con la UI y lógica de negocio actual.

## 📊 Análisis Comparativo de Campos

### Campos en AMBOS modelos (compatibles)
| Campo | Client | Person | Notas |
|-------|--------|--------|-------|
| firstName | ✅ | ✅ | Idéntico |
| lastName | ✅ | ✅ | Idéntico |
| email | ✅ String? | ✅ String? | Idéntico |
| phone | ✅ String? | ✅ String? | Idéntico |
| birthDate | ✅ DateTime? | ✅ DateTime? | Idéntico |
| gender | ✅ String? | ✅ String? | Idéntico |
| address | ✅ String? | ✅ String? | Idéntico |
| city | ✅ String? | ✅ String? | Idéntico |
| postalCode | ✅ String? | ✅ String? | Idéntico |
| countryIsoCode | ✅ String? | ✅ String? | Idéntico |
| nationalId | ✅ String? | ✅ String? | Idéntico |
| taxId | ✅ String? | ✅ String? | Idéntico |
| notes | ✅ String? | ✅ String? | Idéntico |
| systemId | ✅ String | ✅ String | Idéntico |
| createdAt | ✅ DateTime | ✅ DateTime | Idéntico |
| updatedAt | ✅ DateTime | ✅ DateTime | Idéntico |

### Campos EXCLUSIVOS de Client (necesitan migración)
| Campo | Tipo | Propósito | Destino Propuesto |
|-------|------|-----------|-------------------|
| phoneCountryIsoCode | String? | Código país del teléfono principal | PersonClientData |
| secondaryPhone | String? | Teléfono secundario | PersonClientData |
| secondaryPhoneCountryIsoCode | String? | Código país teléfono secundario | PersonClientData |
| fiscalName | String? | Nombre fiscal/comercial | PersonClientData |
| marketingConsent | Boolean | Consentimiento marketing | PersonClientData |
| dataProcessingConsent | Boolean | RGPD/Protección datos | PersonClientData |
| isActive | Boolean | Estado activo/inactivo | PersonClientData |
| companyId | String? | Empresa asociada | PersonClientData |
| originClinicId | String? | Clínica donde se registró | PersonClientData |

### Campos EXCLUSIVOS de Person (nuevos)
| Campo | Tipo | Propósito |
|-------|------|-----------|
| stateProvince | String? | Estado/Provincia |
| nationalIdType | String? | Tipo de documento nacional |
| passportNumber | String? | Número de pasaporte |
| passportCountry | String? | País del pasaporte |

## 🔗 Análisis de Relaciones

### Relaciones de Client que necesitan migración
```prisma
// Relaciones actuales en Client
appointments         Appointment[]        // Citas médicas
tickets              Ticket[]            // Ventas/servicios
invoices             Invoice[]           // Facturas
timeLogs             TimeLog[]           // Registros de tiempo
relationsAsSource    ClientRelation[]    // Relaciones familiares (origen)
relationsAsTarget    ClientRelation[]    // Relaciones familiares (destino)
employmentContracts  EmploymentContract[] // Contratos laborales
bonoInstances        BonoInstance[]      // Bonos activos
packageInstances     PackageInstance[]   // Paquetes activos
loyaltyLedgers       LoyaltyLedger[]     // Puntos de fidelidad
payerPayments        Payment[]           // Pagos como pagador
debts                DebtLedger[]        // Deudas
```

## 🏗️ Arquitectura Propuesta

### 1. Modelo PersonClientData (Extensión específica)
```prisma
model PersonClientData {
  id                           String               @id @default(cuid())
  functionalRoleId             String               @unique
  
  // Campos específicos de cliente
  phoneCountryIsoCode          String?
  secondaryPhone               String?
  secondaryPhoneCountryIsoCode String?
  fiscalName                   String?
  marketingConsent             Boolean              @default(false)
  dataProcessingConsent        Boolean              @default(false)
  isActive                     Boolean              @default(true)
  
  // Referencias opcionales
  companyId                    String?
  originClinicId              String?
  preferredClinicId           String?              // Nueva: clínica preferida
  tariffId                    String?              // Tarifa asignada
  
  // Campos calculados/estadísticas
  totalSpent                   Decimal?             @default(0)
  visitCount                   Int                  @default(0)
  lastVisitDate               DateTime?
  
  // Relaciones
  functionalRole              PersonFunctionalRole  @relation(fields: [functionalRoleId], references: [id], onDelete: Cascade)
  company                     Company?              @relation(fields: [companyId], references: [id])
  originClinic                Clinic?               @relation("ClientOriginClinic", fields: [originClinicId], references: [id])
  preferredClinic             Clinic?               @relation("ClientPreferredClinic", fields: [preferredClinicId], references: [id])
  tariff                      Tariff?               @relation(fields: [tariffId], references: [id])
  
  @@index([companyId])
  @@index([originClinicId])
  @@index([preferredClinicId])
  @@index([tariffId])
}
```

### 2. Migración de Relaciones

**OPCIÓN A: Migración Directa a Person (Recomendada)**
```prisma
// Modificar modelos existentes para apuntar a Person en lugar de Client
model Appointment {
  // Cambiar:
  // clientId    String
  // client      Client    @relation(...)
  
  // Por:
  personId    String
  person      Person    @relation(...)
}
```

**OPCIÓN B: Vista/Tabla Virtual Client (Compatibilidad temporal)**
```sql
-- Crear vista que simula la tabla Client antigua
CREATE VIEW client AS
SELECT 
  p.id,
  p.firstName,
  p.lastName,
  p.email,
  p.phone,
  pcd.phoneCountryIsoCode,
  pcd.secondaryPhone,
  -- ... mapear todos los campos
FROM persons p
INNER JOIN person_functional_roles pfr ON p.id = pfr.person_id
INNER JOIN person_client_data pcd ON pfr.id = pcd.functional_role_id
WHERE pfr.role_type = 'CLIENT' AND pfr.is_active = true;
```

## 📝 Estrategia de Migración Sin Ruptura

### Fase 1: Preparación (1 semana)
1. **Crear estructura paralela**:
   - Añadir PersonClientData al schema
   - NO modificar Client ni sus relaciones aún
   - Crear funciones de conversión Client ↔ Person

2. **Capa de compatibilidad**:
   ```typescript
   // services/client-compatibility.service.ts
   export class ClientCompatibilityService {
     // Wrapper que mantiene la API existente
     async findClient(id: string): Promise<Client> {
       const person = await this.findPersonWithClientRole(id);
       return this.personToClientFormat(person);
     }
     
     async createClient(data: CreateClientDto): Promise<Client> {
       const person = await this.createPersonAsClient(data);
       return this.personToClientFormat(person);
     }
   }
   ```

### Fase 2: Migración de Datos (2 semanas)
1. **Script de migración incremental**:
   ```typescript
   // Migrar por lotes para no bloquear la BD
   async function migrateClientsToPerson(batchSize = 100) {
     let offset = 0;
     let migrated = 0;
     
     while (true) {
       const clients = await prisma.client.findMany({
         take: batchSize,
         skip: offset,
         include: { /* todas las relaciones */ }
       });
       
       if (clients.length === 0) break;
       
       for (const client of clients) {
         // Crear Person + PersonFunctionalRole + PersonClientData
         await createPersonFromClient(client);
         migrated++;
       }
       
       offset += batchSize;
       console.log(`Migrados: ${migrated} clientes`);
     }
   }
   ```

2. **Sincronización bidireccional temporal**:
   - Triggers en BD para mantener Client ↔ Person sincronizados
   - Permite rollback inmediato si hay problemas

### Fase 3: Actualización de Código (2 semanas)
1. **Por módulos, no todo a la vez**:
   - Semana 1: Módulo de citas (Appointment)
   - Semana 2: Módulo de ventas (Ticket)
   - Semana 3: Módulo de facturación (Invoice)
   - Etc.

2. **Feature flags por módulo**:
   ```typescript
   if (featureFlags.usePersonForAppointments) {
     // Nueva lógica con Person
   } else {
     // Lógica antigua con Client
   }
   ```

### Fase 4: Limpieza (1 semana)
1. Eliminar triggers de sincronización
2. Eliminar tabla Client (con backup)
3. Eliminar código de compatibilidad
4. Actualizar documentación

## ⚠️ Consideraciones Críticas

### 1. IDs y Referencias
- **PROBLEMA**: Todas las relaciones usan `clientId`
- **SOLUCIÓN**: 
  - Opción 1: Mantener mismos IDs (Person.id = Client.id original)
  - Opción 2: Tabla de mapeo temporal (client_id → person_id)

### 2. Queries y Performance
- **PROBLEMA**: Queries optimizadas para Client directo
- **SOLUCIÓN**: 
  - Crear índices en Person para campos de búsqueda comunes
  - Vistas materializadas para queries complejas

### 3. Validaciones de Negocio
- **PROBLEMA**: Lógica puede asumir estructura Client
- **SOLUCIÓN**: 
  - Identificar TODAS las validaciones
  - Crear suite de tests exhaustiva
  - Validar comportamiento idéntico pre/post migración

### 4. APIs y Endpoints
- **PROBLEMA**: APIs exponen estructura Client
- **SOLUCIÓN**: 
  - DTOs de compatibilidad
  - Transformers Person → Client format
  - Versionado de API si es necesario

## 🎯 Ventajas del Enfoque

1. **Cero downtime**: Sistema sigue funcionando durante migración
2. **Rollback posible**: En cualquier momento se puede revertir
3. **Migración gradual**: Reduce riesgo por fases
4. **Validación continua**: Cada fase se valida antes de continuar
5. **Transparente para usuarios**: UI no cambia

## 📊 Métricas de Éxito

- ✅ 100% tests pasando pre y post migración
- ✅ Performance igual o mejor
- ✅ Cero errores en producción
- ✅ Cero quejas de usuarios
- ✅ Código más limpio y mantenible

## 🚦 Decisión Requerida

Antes de proceder, necesitamos decidir:

1. **¿Migración con mismo ID o nuevo ID?**
   - Mismo ID: Más simple, menos cambios
   - Nuevo ID: Más limpio, requiere mapeo

2. **¿Vista de compatibilidad o migración directa?**
   - Vista: Más seguro, más lento
   - Directa: Más rápido, más riesgoso

3. **¿Orden de módulos a migrar?**
   - Por criticidad o por simplicidad

4. **¿Timeline agresivo o conservador?**
   - Agresivo: 4 semanas total
   - Conservador: 8-10 semanas
