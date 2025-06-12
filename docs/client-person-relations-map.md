# Mapa de Relaciones de Client a Person

## ANÁLISIS COMPLETO DE RELACIONES DEL MODELO CLIENT

### 1. Relaciones directas donde Client es receptor (clientId)

1. **Appointment** (líneas 759-779)
   - Campo: `clientId` (requerido)
   - Relación: `client` → Client
   - Descripción: Cliente que tiene la cita

2. **Ticket** (líneas 1091-1137)
   - Campo: `clientId` (opcional)
   - Relación: `client` → Client
   - Descripción: Cliente receptor del servicio

3. **Invoice** (líneas 1212-1249)
   - Campo: `clientId` (opcional)
   - Relación: `client` → Client
   - Descripción: Cliente facturado

4. **TimeLog** (líneas 527-534)
   - Campo: `clientId` (opcional)
   - Relación: `client` → Client
   - Descripción: Cliente asociado al registro de tiempo

5. **BonoInstance** (líneas 1437-1451)
   - Campo: `clientId` (requerido)
   - Relación: `client` → Client
   - Descripción: Cliente propietario del bono

6. **PackageInstance** (líneas 1511-1523)
   - Campo: `clientId` (requerido)
   - Relación: `client` → Client
   - Descripción: Cliente propietario del paquete

7. **LoyaltyLedger** (líneas 1594-1607)
   - Campo: `clientId` (requerido)
   - Relación: `client` → Client
   - Descripción: Cliente con puntos de lealtad

8. **DebtLedger** (líneas 1920-1945)
   - Campo: `clientId` (requerido)
   - Relación: `client` → Client
   - Descripción: Cliente con deuda

### 2. Relaciones especiales de pagador

9. **Payment** (líneas 1302-1334)
   - Campo: `payerClientId` (opcional)
   - Relación: `payerClient` → Client (@relation("PayerClientPayments"))
   - Descripción: Cliente que paga (puede ser diferente del receptor)

### 3. Relaciones entre clientes

10. **ClientRelation** (líneas 499-510)
    - Campos: `clientAId`, `clientBId` (ambos requeridos)
    - Relaciones: `clientA` → Client (@relation("ClientA")), `clientB` → Client (@relation("ClientB"))
    - Descripción: Relaciones familiares/tutoriales entre clientes

### 4. Relaciones desde EntityRelation

11. **EntityRelation** (líneas 550-558)
    - Campo: `sourceClientId` (opcional)
    - Relación: `sourceClient` → Client
    - Descripción: Cliente como origen de relación genérica

12. **EntityRelation** (continuación)
    - Campo: `targetClientId` (opcional) [no aparece en búsqueda pero debe existir]
    - Relación: `targetClient` → Client
    - Descripción: Cliente como destino de relación genérica

### 5. Relación controversial (empleados)

13. **EmploymentContract**
    - Campo: `clientId` (opcional)
    - Relación: `client` → Client
    - Descripción: ¿Cliente que es empleado? (Verificar si debe migrar)

## ESTRATEGIA DE MIGRACIÓN INCREMENTAL

### Fase 1: Preparación (actual)
- [x] Crear modelos Person, PersonFunctionalRole, PersonClientData
- [x] Limpiar relaciones incorrectas
- [ ] Documentar todas las relaciones

### Fase 2: Añadir referencias a Person en modelos existentes
- [ ] Añadir personId opcional a cada modelo que tiene clientId
- [ ] Crear relaciones con Person paralelas a las de Client
- [ ] NO eliminar las relaciones con Client todavía

### Fase 3: Migración de datos
- [ ] Script para crear Person desde cada Client
- [ ] Script para actualizar personId en todos los modelos

### Fase 4: Cambio de referencias
- [ ] Hacer personId requerido donde clientId era requerido
- [ ] Hacer clientId opcional donde era requerido
- [ ] Actualizar lógica de aplicación

### Fase 5: Limpieza
- [ ] Eliminar clientId de todos los modelos
- [ ] Eliminar modelo Client
- [ ] Eliminar ClientRelation (reemplazado por EntityRelation)

## PUNTOS CRÍTICOS A VERIFICAR

1. **Payment**: Mantener lógica pagador vs receptor
2. **ClientRelation**: Migrar a EntityRelation con Person
3. **EmploymentContract**: Decidir si migra en esta fase o en fase empleados
4. **Índices**: Crear índices para personId donde había para clientId
5. **Cascadas**: Verificar onDelete para cada relación
