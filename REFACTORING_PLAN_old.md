# 🚀 Plan de Refactorización a Prisma + Supabase (Multi-Tenant Híbrido)

## Fase A: Análisis Funcional y Arquitectura Lógica (Conceptual)

*   ✅ **A.1:** Documentar Entidades Principales: (Ampliadas con RBAC, CRM, Empresas, Dispositivos)
    *   `System`, `User` (Empleado/Admin), `Clinic`, `Role`, `Permission`, `Client` (Paciente), `Company` (Empresa), `ContactPerson`, `Lead` (Presunto), `Service`, `Product`, `Tariff`, `FamiliaTarifa`, `TipoIVA`, `Appointment` (Cita), `Ticket` (Venta), `TicketItem`, `Payment`, `BankAccount`, `PosTerminal`, `CashSession` (Caja), `Promotion`, `Bono`, `Package`, `Equipment`, `Skill`, `StockLedger`, `LoyaltyLedger`, `Horario...`, `Excepcion...`, `EmploymentContract`, `TimeLog`, `Device` (Enchufe Inteligente), `EntityImage`, `EntityDocument`.
*   ✅ **A.2:** Mapear Relaciones Clave: (Refinadas con todas las entidades)
    *   Incluir relaciones para `Company`, `ContactPerson`, `Lead`, `Device`, `EmploymentContract`, `TimeLog`, `BankAccount`, `PosTerminal`.
    *   `Equipment` -> `Device` (Opcional One-to-One/Many-to-One?).
    *   `Appointment` -> `Equipment` (Para saber qué equipo se usa).
*   ✅ **A.3:** Definir Estados y Ciclos de Vida: (Incluir bloqueo de citas por uso de dispositivo)
    *   Estados `Appointment` (añadir `IS_USAGE_LOCKED`).
    *   Flujo: Cita -> (Uso Dispositivo -> Bloqueo) -> Validación -> Ticket.
*   ✅ **A.4:** Consideraciones Multi-País: (Confirmado)
    *   Un `System` puede tener `Clinics` multi-país.
    *   Añadir `countryCode`, `currency`, `locale`, `timezone` a `Clinic`.
*   ✅ **A.5:** Identificar Componentes/Flujos Principales: (Confirmado)
*   ✅ **A.6:** Validar Comprensión General: (Validado en conversación)

## Fase 0: Preparación Técnica y Conexión Inicial

*   ✅ **0.1:** Arreglar bug menú lateral.
*   ✅ **0.2:** Crear Proyecto Supabase y obtener credenciales.
*   ✅ **0.3:** Instalar Prisma.
*   ✅ **0.4:** Inicializar Prisma y Configurar `.env`.
*   ✅ **0.5:** Crear Pantalla Configuración DB.
*   ✅ **0.6:** Crear API Route Test Conexión.
*   ✅ **0.7:** Implementar y Verificar Test Conexión Básico.
*   ✅ **0.8:** Definir Modelo Prisma base `System`.

## Fase 1: Definición y Migración del Esquema Prisma

*   ✅ **1.1:** Definir Modelos Prisma Detallados:
    *   ✅ 1.1.1: Modelo `User`
    *   ✅ 1.1.2: Modelos RBAC: `Role`, `Permission`, `UserRole`, `RolePermission`.
    *   ✅ 1.1.3: Modelos Empresa/Contacto: `Company`, `ContactPerson`.
    *   ✅ 1.1.4: Modelo CRM: `Lead`.
    *   ✅ 1.1.5: Modelo `Client` (con `ClientRelation`).
    *   ✅ 1.1.6: Modelos Empleado: `EmploymentContract`, `TimeLog`.
    *   ✅ 1.1.7: Modelos Financieros Base: `BankAccount`, `PosTerminal`.
    *   ✅ 1.1.8: Modelo Dispositivo: `Device`.
    *   ✅ 1.1.9: Modelo `Equipment` (Revisar si necesita datos iniciales - seeding)
    *   ✅ 1.1.10: Modelo `Appointment` (con campos anti-fraude).
    *   ✅ 1.1.11: Modelo `Clinic`.
    *   ✅ 1.1.12: Modelos Horarios y Excepciones (`ScheduleTemplate`, `Block`, `UserSchedule`, `ClinicSchedule`, `Exception`).
    *   ✅ 1.1.13: Modelos Catálogo y Stock (`Service`, `Product`, `StockLedger`).
    *   ✅ 1.1.14: Modelos Tarifas (`VATType`, `Tariff`).
    *   ✅ 1.1.15: Modelos Ventas y Caja (`Ticket`, `TicketItem`, `Payment`, `CashSession`).
    *   ✅ 1.1.16: Modelos Bonos y Paquetes (`BonoDefinition`, `BonoInstance`, `PackageDefinition`, `PackageItem`).
    *   ✅ 1.1.17: Modelo `Promotion`.
    *   ✅ 1.1.18: Modelo `Skill` (`UserSkill`).
    *   ✅ 1.1.19: Modelo `LoyaltyLedger`.
    *   ✅ 1.1.20: Modelos Archivos Adjuntos (`EntityImage`, `EntityDocument`).
    *   ⚠️ **1.1.21:** Modelo `Familia` (o Categoria/Grupo) para Servicios/Productos/Tarifas/Paquetes (Pendiente)
*   ✅ **1.2:** Generar y Aplicar Migración Inicial (`initial-schema`).
*   ✅ **1.3:** Generar Cliente Prisma Actualizado.
*   ⏳ **1.4:** Migración Datos Mock (Script `prisma/seed.ts`) (Parcial - Pendiente Equipamiento, Familia, etc.).

➡️ ## Fase 2: Implementación del Backend (API Routes con Prisma)

*   ⏳ **2.1:** Crear rutas API básicas (GET, POST, PUT, DELETE) para entidades principales:
    *   ✅ 2.1.1: Rutas API básicas para Clínicas (Asumido).
    *   ⏳ 2.1.2: Rutas API básicas para Usuarios:
        *   `GET /api/users` (Asumido/Pendiente revisar)
        *   `POST /api/users` (Asumido/Pendiente revisar)
        *   `GET /api/users/[id]` (Asumido/Pendiente revisar)
        *   `PUT /api/users/[id]` (Asumido/Pendiente revisar)
        *   ⏳ `GET /api/users/byClinic/[clinicId]` (En progreso)
        *   ⏳ `PATCH /api/users/[id]/toggle-status` (Pendiente)
    *   ⚠️ 2.1.3: Rutas API para Equipamiento (Pendiente).
    *   ⚠️ 2.1.4: Rutas API para Familia (Pendiente).
*   ⚠️ **2.2:** Implementar autenticación (Supabase Auth) en las rutas API.
*   ⚠️ **2.3:** Implementar autorización básica basada en roles (RBAC) en las rutas API.
*   ⚠️ **2.4:** Crear rutas API para operaciones más complejas (ej: buscar citas por rango, obtener disponibilidad).

## Fase 3: Refactorización del Frontend

*   ⚠️ **3.1:** Crear `PrismaDataService` con `fetch` (o usar Server Actions).
*   ❌ **3.2:** Actualizar Proveedor Contexto (`UserContext`, `RoleContext` revisados) -> **¡ERROR PERSISTENTE!**
    *   ⚠️ **3.2.1:** **Corregir Errores de Sintaxis/Restauración en `contexts/user-context.ts`** (Bloqueante)
*   ⏳ **3.3:** Refactorizar Componentes para carga específica (respetando estética):
    *   ✅ `app/configuracion/usuarios/page.tsx`
    *   ✅ `app/configuracion/clinicas/[id]/usuarios/page.tsx`
    *   ✅ `components/usuarios-clinica.tsx`
    *   ⏳ `app/configuracion/usuarios/[id]/page.tsx` (Refactorizado, pero con secciones comentadas pendientes de API/lógica)
    *   ⏳ `app/configuracion/clinicas/[id]/page.tsx` (Carga de Equipamiento añadida, pero con **Errores Bloqueados** por `UserContextType`)
    *   ⚠️ Refactorizar **Componente Agenda** para usar datos DB/API (Horarios, Citas).
    *   ⚠️ Refactorizar componentes que usan datos hardcodeados de Equipamiento (Pendiente interacción POST/PUT/DELETE).
    *   ⚠️ Refactorizar componentes que usan datos hardcodeados de Familias/Tarifas.
*   ⚠️ **3.4:** Implementar UI para gestión de Roles/Permisos.
*   ⚠️ **3.5:** Implementar lógica de UI basada en permisos.
*   ⚠️ **3.6:** Eliminar Código Obsoleto (`LocalDataService`, `localStorage`, `initialMockData.ts`).
*   ⚠️ **3.7:** Revisar/Definir Tabla `Category`/`Familia` en `schema.prisma` (Modelo Creado, Pendiente Seeding/Uso).
*   ⚠️ **3.8:** Revisar/Poblar Tabla `Equipamiento` en `schema.prisma` (seeding) (Pendiente datos mock).
*   ⚠️ **3.9:** Migrar datos hardcodeados (`EQUIPAMIENTO_MOCK`, `FAMILIAS_MOCK`) a la base de datos (seeding script) (Pendiente datos mock `familias`).

## Fase 4: Pruebas y Despliegue

*   ⚠️ **4.1:** Pruebas Exhaustivas.
*   ⚠️ **4.2:** Configuración Despliegue Vercel.
*   ⚠️ **4.3:** Desplegar y Monitorizar.

---

## Apéndice: Definición de Tablas Prisma

Esta sección documenta los modelos definidos en `prisma/schema.prisma` para referencia y evitar duplicidades.

### `System`
*   **Propósito:** Representa un tenant o cliente individual del SaaS. Es la tabla central que agrupa todos los datos de un cliente específico.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `isActive` (Boolean).
*   **Relaciones:** Tiene relaciones inversas (uno-a-muchos) con casi todas las demás tablas del sistema (`User`, `Clinic`, `Role`, `Client`, `Service`, `Product`, `Ticket`, `Appointment`, etc.).

### `User`
*   **Propósito:** Almacena la información de los usuarios del sistema (empleados, administradores) que pueden iniciar sesión.
*   **Columnas Principales:** `id` (String, CUID), `email` (String, @unique), `firstName` (String), `lastName` (String), `passwordHash` (String), `profileImageUrl` (String?), `isActive` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `UserRole`: Uno-a-muchos (tabla de unión con `Role`).
    *   `UserSchedule`: Uno-a-muchos con `UserSchedule`.
    *   `TimeLog`: Uno-a-muchos con `TimeLog`.
    *   `EmploymentContract`: Uno-a-muchos con `EmploymentContract`.
    *   `Lead`: Uno-a-muchos (campo `assignedToUser`).
    *   `Appointment`: Uno-a-muchos (campo `professionalUser`, relación "ProfessionalUserAppointments").
    *   `Ticket`: Uno-a-muchos (campo `cashierUser`, relación "CashierUserTickets").
    *   `Payment`: Uno-a-muchos (campo `user`).
    *   `CashSession`: Uno-a-muchos (campo `user`).
    *   `LoyaltyLedger`: Uno-a-muchos (campo `user`).
    *   `StockLedger`: Uno-a-muchos (campo `user`).
    *   `UserSkill`: Uno-a-muchos (tabla de unión con `Skill`).
    *   `ScheduleException`: Uno-a-muchos (campo `user`).
    *   `EntityImage`: Uno-a-muchos (campo `uploadedByUser`, relación "UploadedImages").
    *   `EntityDocument`: Uno-a-muchos (campo `uploadedByUser`, relación "UploadedDocuments").
    *   `UserClinicAssignment`: Uno-a-muchos (tabla de unión con `Clinic`).

### `Clinic`
*   **Propósito:** Representa una ubicación física o centro operativo dentro de un `System`.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `address` (String?), `city` (String?), `postalCode` (String?), `province` (String?), `countryCode` (String?), `timezone` (String?), `currency` (String), `phone` (String?), `email` (String?), `isActive` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `BankAccount`: Uno-a-muchos (campo `clinic`).
    *   `PosTerminal`: Uno-a-muchos (campo `clinic`).
    *   `Equipment`: Uno-a-muchos (campo `clinic`).
    *   `Appointment`: Uno-a-muchos (campo `clinic`).
    *   `Client`: Uno-a-muchos (campo `originClinic`).
    *   `ClinicSchedule`: Uno-a-muchos con `ClinicSchedule`.
    *   `ScheduleException`: Uno-a-muchos (campo `clinic`).
    *   `Ticket`: Uno-a-muchos (campo `clinic`).
    *   `CashSession`: Uno-a-muchos (campo `clinic`).
    *   `UserClinicAssignment`: Uno-a-muchos (tabla de unión con `User`).

### `Role`
*   **Propósito:** Define un rol dentro del sistema para el control de acceso basado en roles (RBAC).
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `UserRole`: Uno-a-muchos (tabla de unión con `User`).
    *   `RolePermission`: Uno-a-muchos (tabla de unión con `Permission`).

### `Permission`
*   **Propósito:** Define una acción específica sobre un módulo que puede ser permitida o denegada (RBAC).
*   **Columnas Principales:** `id` (String, CUID), `action` (String), `module` (String), `description` (String?).
*   **Relaciones:**
    *   `RolePermission`: Uno-a-muchos (tabla de unión con `Role`).

### `UserRole`
*   **Propósito:** Tabla de unión para la relación muchos-a-muchos entre `User` y `Role`. Asigna roles a usuarios.
*   **Columnas Principales:** `userId` (String), `roleId` (String), `assignedAt` (DateTime).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `Role`: Muchos-a-uno con `Role`.

### `RolePermission`
*   **Propósito:** Tabla de unión para la relación muchos-a-muchos entre `Role` y `Permission`. Asigna permisos a roles.
*   **Columnas Principales:** `roleId` (String), `permissionId` (String), `assignedAt` (DateTime).
*   **Relaciones:**
    *   `Role`: Muchos-a-uno con `Role`.
    *   `Permission`: Muchos-a-uno con `Permission`.

### `Company`
*   **Propósito:** Almacena información sobre empresas (clientes B2B, proveedores, etc.).
*   **Columnas Principales:** `id` (String, CUID), `legalName` (String), `commercialName` (String?), `taxId` (String?, @unique), `address` (String?), `city` (String?), `postalCode` (String?), `province` (String?), `countryCode` (String?), `email` (String?), `phone` (String?), `website` (String?), `notes` (String?), `isClient` (Boolean), `isSupplier` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `ContactPerson`: Uno-a-muchos con `ContactPerson`.
    *   `Ticket`: Uno-a-muchos (campo `company`).

### `ContactPerson`
*   **Propósito:** Almacena información sobre personas de contacto asociadas a una `Company`.
*   **Columnas Principales:** `id` (String, CUID), `firstName` (String), `lastName` (String), `position` (String?), `email` (String?), `phone` (String?), `notes` (String?), `companyId` (String), `systemId` (String).
*   **Relaciones:**
    *   `Company`: Muchos-a-uno con `Company`.
    *   `System`: Muchos-a-uno con `System`.

### `Lead`
*   **Propósito:** Representa un cliente potencial o presunto (CRM).
*   **Columnas Principales:** `id` (String, CUID), `firstName` (String?), `lastName` (String?), `email` (String?), `phone` (String?), `companyName` (String?), `source` (String?), `status` (Enum `LeadStatus`), `notes` (String?), `assignedToUserId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User` (campo `assignedToUser`).
    *   `System`: Muchos-a-uno con `System`.

### `Client`
*   **Propósito:** Almacena información sobre clientes finales (pacientes, personas físicas).
*   **Columnas Principales:** `id` (String, CUID), `firstName` (String), `lastName` (String), `birthDate` (DateTime?), `gender` (String?), `email` (String?), `phone` (String?), `address` (String?), `city` (String?), `postalCode` (String?), `province` (String?), `countryCode` (String?), `notes` (String?), `marketingConsent` (Boolean), `medicalHistoryConsent` (Boolean), `loyaltyPoints` (Int), `isActive` (Boolean), `originClinicId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `Clinic`: Muchos-a-uno con `Clinic` (campo `originClinic`).
    *   `System`: Muchos-a-uno con `System`.
    *   `ClientRelation`: Uno-a-muchos (relación reflexiva consigo mismo, relaciones "ClientA" y "ClientB").
    *   `Appointment`: Uno-a-muchos (campo `client`).
    *   `Ticket`: Uno-a-muchos (campo `client`).
    *   `BonoInstance`: Uno-a-muchos (campo `client`).
    *   `LoyaltyLedger`: Uno-a-muchos (campo `client`).

### `ClientRelation`
*   **Propósito:** Tabla de unión para la relación muchos-a-muchos reflexiva de `Client`, permitiendo definir relaciones entre clientes (ej: familiares).
*   **Columnas Principales:** `clientAId` (String), `clientBId` (String), `relationType` (String), `notes` (String?).
*   **Relaciones:**
    *   `Client`: Dos relaciones muchos-a-uno con `Client` (campos `clientA` y `clientB`).

### `EmploymentContract`
*   **Propósito:** Almacena información sobre los contratos laborales de los `User`.
*   **Columnas Principales:** `id` (String, CUID), `userId` (String), `contractType` (String?), `startDate` (DateTime), `endDate` (DateTime?), `jobTitle` (String?), `salaryInfo` (String?), `details` (String?), `documentUrl` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `System`: Muchos-a-uno con `System`.

### `TimeLog`
*   **Propósito:** Registra los fichajes de entrada y salida de los `User`.
*   **Columnas Principales:** `id` (String, CUID), `userId` (String), `clockInTime` (DateTime), `clockOutTime` (DateTime?), `date` (DateTime, @db.Date), `durationMinutes` (Int?), `notes` (String?), `source` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `System`: Muchos-a-uno con `System`.

### `BankAccount`
*   **Propósito:** Almacena información sobre cuentas bancarias asociadas al sistema o a clínicas.
*   **Columnas Principales:** `id` (String, CUID), `accountName` (String), `iban` (String, @unique), `swiftBic` (String?), `bankName` (String?), `currency` (String), `notes` (String?), `systemId` (String), `clinicId` (String?).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `PosTerminal`: Uno-a-muchos (campo `bankAccount`).
    *   `Payment`: Uno-a-muchos (campo `bankAccount`).

### `PosTerminal`
*   **Propósito:** Representa un terminal de punto de venta (TPV) físico o virtual.
*   **Columnas Principales:** `id` (String, CUID), `terminalIdProvider` (String?), `name` (String), `bankAccountId` (String), `clinicId` (String?), `provider` (String?), `isActive` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `BankAccount`: Muchos-a-uno con `BankAccount`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `System`: Muchos-a-uno con `System`.
    *   `Payment`: Uno-a-muchos (campo `posTerminal`).

### `Equipment`
*   **Propósito:** Almacena información sobre el equipamiento físico de las clínicas (ej: máquinas láser).
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `serialNumber` (String?, @unique), `modelNumber` (String?), `purchaseDate` (DateTime?), `warrantyEndDate` (DateTime?), `location` (String?), `notes` (String?), `isActive` (Boolean), `systemId` (String), `clinicId` (String?), `deviceId` (String?, @unique).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `Device`: Uno-a-uno con `Device` (campo `device`).
    *   `Appointment`: Uno-a-muchos (campo `equipment`).

### `Device`
*   **Propósito:** Representa un dispositivo inteligente (ej: enchufe inteligente) que puede controlar `Equipment`.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `deviceIdProvider` (String?, @unique), `deviceType` (String?), `apiEndpoint` (String?), `lastKnownStatus` (Enum `DeviceStatus`?), `notes` (String?), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Equipment`: Uno-a-uno con `Equipment` (campo `equipmentControlled`).

### `Appointment`
*   **Propósito:** Representa una cita agendada para un cliente con un profesional en una clínica.
*   **Columnas Principales:** `id` (String, CUID), `startTime` (DateTime), `endTime` (DateTime), `durationMinutes` (Int), `status` (Enum `AppointmentStatus`), `notes` (String?), `clientNotes` (String?), `clientId` (String), `professionalUserId` (String), `systemId` (String), `clinicId` (String), `equipmentId` (String?), `deviceActivationTimestamp` (DateTime?), `deviceDeactivationTimestamp` (DateTime?), `actualUsageMinutes` (Int?), `isUsageLocked` (Boolean), `originalAppointmentId` (String?).
*   **Relaciones:**
    *   `Client`: Muchos-a-uno con `Client`.
    *   `User`: Muchos-a-uno con `User` (campo `professionalUser`).
    *   `System`: Muchos-a-uno con `System`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `Equipment`: Muchos-a-uno con `Equipment`.
    *   `Ticket`: Uno-a-muchos (a través del campo `appointmentId` en `Ticket`).

### `ScheduleTemplate`
*   **Propósito:** Define una plantilla de horario reutilizable (ej: "Jornada Completa").
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `ScheduleTemplateBlock`: Uno-a-muchos con `ScheduleTemplateBlock`.
    *   `UserSchedule`: Uno-a-muchos con `UserSchedule`.
    *   `ClinicSchedule`: Uno-a-muchos con `ClinicSchedule`.

### `ScheduleTemplateBlock`
*   **Propósito:** Representa un bloque de tiempo (ej: Lunes 9:00-14:00) dentro de una `ScheduleTemplate`.
*   **Columnas Principales:** `id` (String, CUID), `templateId` (String), `dayOfWeek` (Enum `DayOfWeek`), `startTime` (String), `endTime` (String), `isWorking` (Boolean).
*   **Relaciones:**
    *   `ScheduleTemplate`: Muchos-a-uno con `ScheduleTemplate`.

### `UserSchedule`
*   **Propósito:** Asigna una `ScheduleTemplate` a un `User` para un período específico.
*   **Columnas Principales:** `id` (String, CUID), `userId` (String), `templateId` (String), `startDate` (DateTime, @db.Date), `endDate` (DateTime?, @db.Date), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `ScheduleTemplate`: Muchos-a-uno con `ScheduleTemplate`.
    *   `System`: Muchos-a-uno con `System`.

### `ClinicSchedule`
*   **Propósito:** Asigna una `ScheduleTemplate` a una `Clinic` (horario general) para un período específico.
*   **Columnas Principales:** `id` (String, CUID), `clinicId` (String), `templateId` (String), `startDate` (DateTime, @db.Date), `endDate` (DateTime?, @db.Date), `systemId` (String).
*   **Relaciones:**
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `ScheduleTemplate`: Muchos-a-uno con `ScheduleTemplate`.
    *   `System`: Muchos-a-uno con `System`.

### `ScheduleException`
*   **Propósito:** Define excepciones a los horarios normales (festivos, vacaciones, cierres especiales).
*   **Columnas Principales:** `id` (String, CUID), `description` (String), `startDate` (DateTime), `endDate` (DateTime), `isAllDay` (Boolean), `type` (Enum `ExceptionType`), `scope` (Enum `ExceptionScope`), `userId` (String?), `clinicId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `System`: Muchos-a-uno con `System`.

### `Service`
*   **Propósito:** Define los servicios ofrecidos por las clínicas.
*   **Columnas Principales:** `id` (String, CUID), `code` (String?), `name` (String), `description` (String?), `durationMinutes` (Int), `price` (Float?), `colorCode` (String?), `requiresMedicalSignOff` (Boolean), `pointsAwarded` (Int), `isActive` (Boolean), `systemId` (String), `categoryId` (String?), `vatTypeId` (String?).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Category`: Muchos-a-uno con `Category`.
    *   `VATType`: Muchos-a-uno con `VATType`.
    *   `TicketItem`: Uno-a-muchos (campo `service`).
    *   `BonoDefinition`: Uno-a-muchos (campo `service`).
    *   `PackageItem`: Uno-a-muchos (campo `service`).

### `Product`
*   **Propósito:** Define los productos físicos (venta o consumo interno).
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `sku` (String?, @unique), `barcode` (String?), `price` (Float?), `costPrice` (Float?), `currentStock` (Int), `minStockThreshold` (Int?), `isForSale` (Boolean), `isInternalUse` (Boolean), `isActive` (Boolean), `systemId` (String), `categoryId` (String?), `vatTypeId` (String?).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Category`: Muchos-a-uno con `Category`.
    *   `VATType`: Muchos-a-uno con `VATType`.
    *   `StockLedger`: Uno-a-muchos (campo `product`).
    *   `TicketItem`: Uno-a-muchos (campo `product`).
    *   `PackageItem`: Uno-a-muchos (campo `product`).

### `StockLedger`
*   **Propósito:** Registra todos los movimientos de stock de los `Product`.
*   **Columnas Principales:** `id` (String, CUID), `productId` (String), `movementType` (Enum `StockMovementType`), `quantity` (Int), `movementDate` (DateTime), `notes` (String?), `userId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `Product`: Muchos-a-uno con `Product`.
    *   `User`: Muchos-a-uno con `User`.
    *   `System`: Muchos-a-uno con `System`.

### `VATType`
*   **Propósito:** Define los diferentes tipos de IVA aplicables.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `rate` (Float), `isDefault` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Service`: Uno-a-muchos (campo `vatType`).
    *   `Product`: Uno-a-muchos (campo `vatType`).
    *   `Tariff`: Uno-a-muchos (campo `defaultVatType`).
    *   `TicketItem`: Uno-a-muchos (relaciones "AppliedVATType" y "OriginalVATType").

### `Tariff`
*   **Propósito:** Define una lista de precios o tarifa.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `isDefault` (Boolean), `validFrom` (DateTime?, @db.Date), `validUntil` (DateTime?, @db.Date), `isActive` (Boolean), `systemId` (String), `defaultVatTypeId` (String?).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `VATType`: Muchos-a-uno con `VATType` (campo `defaultVatType`).

### `Ticket`
*   **Propósito:** Representa una venta o transacción (factura, recibo).
*   **Columnas Principales:** `id` (String, CUID), `ticketNumber` (String), `status` (Enum `TicketStatus`), `issueDate` (DateTime), `totalAmount` (Float), `discountAmount` (Float), `taxAmount` (Float), `finalAmount` (Float), `notes` (String?), `clientId` (String?), `companyId` (String?), `cashierUserId` (String), `clinicId` (String), `systemId` (String), `appointmentId` (String?, @unique).
*   **Relaciones:**
    *   `Client`: Muchos-a-uno con `Client`.
    *   `Company`: Muchos-a-uno con `Company`.
    *   `User`: Muchos-a-uno con `User` (campo `cashierUser`).
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `System`: Muchos-a-uno con `System`.
    *   `Appointment`: Uno-a-uno con `Appointment` (campo `appointment`).
    *   `TicketItem`: Uno-a-muchos con `TicketItem`.
    *   `Payment`: Uno-a-muchos con `Payment`.

### `TicketItem`
*   **Propósito:** Representa una línea individual dentro de un `Ticket` (un servicio o producto vendido).
*   **Columnas Principales:** `id` (String, CUID), `ticketId` (String), `itemType` (String), `serviceId` (String?), `productId` (String?), `description` (String), `quantity` (Float), `unitPrice` (Float), `discountPercent` (Float), `discountAmount` (Float), `vatRateId` (String?), `vatAmount` (Float), `finalPrice` (Float), `originalVatTypeId` (String?).
*   **Relaciones:**
    *   `Ticket`: Muchos-a-uno con `Ticket`.
    *   `Service`: Muchos-a-uno con `Service`.
    *   `Product`: Muchos-a-uno con `Product`.
    *   `VATType`: Dos relaciones muchos-a-uno con `VATType` (campos `vatRate` y `originalVatType`).

### `Payment`
*   **Propósito:** Registra un pago asociado a un `Ticket`.
*   **Columnas Principales:** `id` (String, CUID), `ticketId` (String), `amount` (Float), `paymentMethod` (Enum `PaymentMethod`), `paymentDate` (DateTime), `transactionReference` (String?), `notes` (String?), `cashSessionId` (String?), `posTerminalId` (String?), `bankAccountId` (String?), `userId` (String), `systemId` (String).
*   **Relaciones:**
    *   `Ticket`: Muchos-a-uno con `Ticket`.
    *   `CashSession`: Muchos-a-uno con `CashSession`.
    *   `PosTerminal`: Muchos-a-uno con `PosTerminal`.
    *   `BankAccount`: Muchos-a-uno con `BankAccount`.
    *   `User`: Muchos-a-uno con `User`.
    *   `System`: Muchos-a-uno con `System`.

### `CashSession`
*   **Propósito:** Representa una sesión de caja (apertura, cierre, arqueo) en una clínica.
*   **Columnas Principales:** `id` (String, CUID), `userId` (String), `clinicId` (String), `openingTime` (DateTime), `closingTime` (DateTime?), `status` (Enum `CashSessionStatus`), `openingBalance` (Float), `closingBalance` (Float?), `expectedBalance` (Float?), `difference` (Float?), `notes` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `System`: Muchos-a-uno con `System`.
    *   `Payment`: Uno-a-muchos (campo `cashSession`).

### `BonoDefinition`
*   **Propósito:** Define un tipo de bono (ej: 10 sesiones de X servicio).
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `serviceId` (String), `numberOfSessions` (Int), `price` (Float), `validityDays` (Int?), `isActive` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `Service`: Muchos-a-uno con `Service`.
    *   `System`: Muchos-a-uno con `System`.
    *   `BonoInstance`: Uno-a-muchos con `BonoInstance`.

### `BonoInstance`
*   **Propósito:** Representa una instancia específica de un bono comprada por un cliente.
*   **Columnas Principales:** `id` (String, CUID), `bonoDefinitionId` (String), `clientId` (String), `purchaseDate` (DateTime), `expiryDate` (DateTime?), `remainingSessions` (Int), `purchaseTicketItemId` (String?, @unique), `systemId` (String).
*   **Relaciones:**
    *   `BonoDefinition`: Muchos-a-uno con `BonoDefinition`.
    *   `Client`: Muchos-a-uno con `Client`.
    *   `System`: Muchos-a-uno con `System`.
    *   (Relación comentada con `TicketItem` para el item de compra).

### `PackageDefinition`
*   **Propósito:** Define un paquete que agrupa varios servicios y/o productos a un precio conjunto.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `price` (Float), `isActive` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `PackageItem`: Uno-a-muchos con `PackageItem`.

### `PackageItem`
*   **Propósito:** Representa un ítem (servicio o producto) incluido dentro de una `PackageDefinition`.
*   **Columnas Principales:** `id` (String, CUID), `packageDefinitionId` (String), `itemType` (String), `serviceId` (String?), `productId` (String?), `quantity` (Float).
*   **Relaciones:**
    *   `PackageDefinition`: Muchos-a-uno con `PackageDefinition`.
    *   `Service`: Muchos-a-uno con `Service`.
    *   `Product`: Muchos-a-uno con `Product`.

### `Promotion`
*   **Propósito:** Define promociones aplicables a ventas (descuentos, regalos, etc.).
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `code` (String?, @unique), `type` (Enum `PromotionType`), `value` (Float?), `minPurchaseAmount` (Float?), `maxDiscountAmount` (Float?), `startDate` (DateTime), `endDate` (DateTime?), `maxUses` (Int?), `usesPerClient` (Int?), `currentUses` (Int), `isActive` (Boolean), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.

### `LoyaltyLedger`
*   **Propósito:** Registra los movimientos de puntos de fidelidad para los `Client`.
*   **Columnas Principales:** `id` (String, CUID), `clientId` (String), `movementType` (Enum `LoyaltyMovementType`), `points` (Int), `movementDate` (DateTime), `notes` (String?), `expiryDate` (DateTime?), `userId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `Client`: Muchos-a-uno con `Client`.
    *   `User`: Muchos-a-uno con `User`.
    *   `System`: Muchos-a-uno con `System`.

### `Skill`
*   **Propósito:** Define habilidades o competencias profesionales que pueden tener los `User`.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `UserSkill`: Uno-a-muchos (tabla de unión con `User`).

### `UserSkill`
*   **Propósito:** Tabla de unión para la relación muchos-a-muchos entre `User` y `Skill`. Asigna habilidades a usuarios.
*   **Columnas Principales:** `userId` (String), `skillId` (String), `assignedAt` (DateTime).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `Skill`: Muchos-a-uno con `Skill`.

### `EntityImage`
*   **Propósito:** Almacena referencias a imágenes asociadas a diferentes entidades del sistema (polimórfico).
*   **Columnas Principales:** `id` (String, CUID), `entityId` (String), `entityType` (Enum `EntityType`), `imageUrl` (String), `altText` (String?), `caption` (String?), `order` (Int?), `isProfilePic` (Boolean), `uploadedByUserId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User` (campo `uploadedByUser`).
    *   `System`: Muchos-a-uno con `System`.
    *   (Relación lógica con la entidad referenciada por `entityId` y `entityType`).

### `EntityDocument`
*   **Propósito:** Almacena referencias a documentos asociados a diferentes entidades del sistema (polimórfico).
*   **Columnas Principales:** `id` (String, CUID), `entityId` (String), `entityType` (Enum `EntityType`), `documentUrl` (String), `fileName` (String), `fileType` (String?), `fileSize` (Int?), `description` (String?), `uploadedByUserId` (String?), `systemId` (String).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User` (campo `uploadedByUser`).
    *   `System`: Muchos-a-uno con `System`.
    *   (Relación lógica con la entidad referenciada por `entityId` y `entityType`).

### `UserClinicAssignment`
*   **Propósito:** Tabla de unión para la relación muchos-a-muchos entre `User` y `Clinic`. Asigna usuarios a clínicas.
*   **Columnas Principales:** `userId` (String), `clinicId` (String), `assignedAt` (DateTime).
*   **Relaciones:**
    *   `User`: Muchos-a-uno con `User`.
    *   `Clinic`: Muchos-a-uno con `Clinic`.

### `Category`
*   **Propósito:** Define categorías o familias para agrupar `Service` y `Product`.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `description` (String?), `systemId` (String).
*   **Relaciones:**
    *   `System`: Muchos-a-uno con `System`.
    *   `Service`: Uno-a-muchos (campo `category`).
    *   `Product`: Uno-a-muchos (campo `category`).

### `Cabin`
*   **Propósito:** Representa una cabina o sala física dentro de una `Clinic` donde se realizan servicios.
*   **Columnas Principales:** `id` (String, CUID), `name` (String), `code` (String?), `color` (String?), `order` (Int?), `isActive` (Boolean), `clinicId` (String), `systemId` (String).
*   **Relaciones:**
    *   `Clinic`: Muchos-a-uno con `Clinic`.
    *   `System`: Muchos-a-uno con `System`. 