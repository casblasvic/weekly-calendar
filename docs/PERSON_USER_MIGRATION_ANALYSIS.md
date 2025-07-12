# 📋 **ANÁLISIS DE MIGRACIÓN: Users → Extensión de Person**

## 🎯 **OBJETIVO CORREGIDO**
Adaptar la tabla **Users EXISTENTE** para que sea directamente la extensión del modelo **Person**, manteniendo el nombre `users` y **CERO cambios** en APIs, hooks, importaciones y contextos existentes.

## 📊 **SITUACIÓN ACTUAL DETECTADA**

### **Estructura Existente:**
```
Person (MODELO BASE EXISTENTE)
├── Datos personales globales (firstName, lastName, email, phone, etc.)
├── systemId (multi-tenant)
└── Ya tiene relación con Client

User (EMPLEADOS - TABLA EXISTENTE A ADAPTAR)
├── id, name, email, role, clinicId, systemId
├── Datos duplicados con Person (name, email)
└── Usado en TODA la aplicación (APIs, hooks, contextos)
```

### **Problema Actual:**
- **Users** y **Person** tienen datos duplicados (name/email)
- **Users** no aprovecha la base Person existente
- **No permite roles múltiples** (empleado que también sea cliente)

## 🚀 **ESTRATEGIA CORREGIDA: Adaptar Users Existente**

### **Fase 1: Convertir Users en Extensión de Person**

#### **1.1 Adaptar modelo User existente (NO crear tabla nueva)**
```prisma
// MODELO User EXISTENTE - ADAPTADO para ser extensión de Person
model User {
  id       Int    @id @default(autoincrement())
  
  // NUEVA RELACIÓN: User como extensión de Person
  personId String @unique
  person   Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Datos específicos de empleado (mantener existentes)
  role     String
  clinicId Int
  systemId String
  
  // Campos temporales durante migración (gradualmente deprecar)
  name     String?    // Migrar a person.firstName + person.lastName
  email    String?    // Migrar a person.email
  
  // Metadatos existentes
  createdAt DateTime? @default(now())
  updatedAt DateTime? @updatedAt
  
  @@map("users") // MANTENER nombre de tabla existente
}

// MODELO Person EXISTENTE - Agregar relación
model Person {
  id        String   @id @default(cuid())
  systemId  String
  firstName String
  lastName  String
  email     String?
  phone     String?
  address   String?
  birthDate DateTime?
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones existentes
  client    PersonClient?
  
  // NUEVA RELACIÓN: Person puede ser empleado
  employee  User?  // Un Person puede ser empleado (User)
  
  @@map("persons")
}
```

#### **1.2 Script de Migración (Adaptar Users existente)**
```typescript
/**
 * 🔄 MIGRACIÓN: Adaptar Users para usar Person como base
 * NO crea nuevas tablas, adapta la existente
 */
async function adaptUsersToPersonExtension() {
  console.log("🚀 Iniciando adaptación Users → Extensión de Person...")
  
  // 1. Agregar columna personId a tabla users (SQL directo)
  await prisma.$executeRaw`ALTER TABLE users ADD COLUMN person_id TEXT UNIQUE;`
  
  const users = await prisma.user.findMany()
  console.log(`📊 Encontrados ${users.length} usuarios a adaptar`)
  
  for (const user of users) {
    try {
      // 2. Buscar si ya existe Person con el mismo email
      let person = await prisma.person.findFirst({
        where: {
          email: user.email,
          systemId: user.systemId
        }
      })
      
      // 3. Si no existe, crear Person con datos del User
      if (!person) {
        const [firstName, ...lastNameParts] = (user.name || '').split(' ')
        
        person = await prisma.person.create({
          data: {
            systemId: user.systemId,
            firstName: firstName || user.name || 'Sin nombre',
            lastName: lastNameParts.join(' ') || '',
            email: user.email,
            // Migrar otros campos si existen
            phone: user.phone || null,
            avatar: user.avatar || null,
          }
        })
        console.log(`✅ Person creado: ${person.firstName} ${person.lastName}`)
      } else {
        console.log(`📝 Person existente encontrado: ${person.firstName} ${person.lastName}`)
      }
      
      // 4. Actualizar User para referenciar Person
      await prisma.user.update({
        where: { id: user.id },
        data: {
          personId: person.id
        }
      })
      
      console.log(`✅ User ID ${user.id} ahora referencia Person ${person.id}`)
      
    } catch (error) {
      console.error(`❌ Error adaptando usuario ${user.id}:`, error)
    }
  }
  
  console.log("🎉 Adaptación completada")
  console.log("⚠️  Campos name y email en User ahora son opcionales")
  console.log("⚠️  Usar person.firstName, person.lastName, person.email")
}
```

### **Fase 2: Adaptación de APIs (CERO cambios en rutas)**

#### **2.1 API Users (Misma ruta, lógica adaptada)**
```typescript
// app/api/users/route.ts - MISMA RUTA, lógica interna adaptada
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // NUEVA LÓGICA INTERNA: Users con Person incluido
    const users = await prisma.user.findMany({
      include: {
        person: true // Incluir datos de Person
      }
    })
    
    // MANTENER FORMATO IDÉNTICO al actual
    const result = users.map(user => ({
      id: user.id,
      name: user.person ? `${user.person.firstName} ${user.person.lastName}` : user.name,
      email: user.person?.email || user.email,
      role: user.role,
      clinicId: user.clinicId,
      systemId: user.systemId,
      
      // NUEVOS campos disponibles (opcional para frontend)
      firstName: user.person?.firstName,
      lastName: user.person?.lastName,
      phone: user.person?.phone,
      avatar: user.person?.avatar,
      personId: user.person?.id,
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userData = await request.json()
    
    // NUEVA LÓGICA: Crear Person primero, luego User
    const person = await prisma.person.create({
      data: {
        systemId: userData.systemId,
        firstName: userData.firstName || userData.name?.split(' ')[0] || '',
        lastName: userData.lastName || userData.name?.split(' ').slice(1).join(' ') || '',
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
      }
    })
    
    const user = await prisma.user.create({
      data: {
        personId: person.id, // Referenciar Person
        role: userData.role,
        clinicId: userData.clinicId,
        systemId: userData.systemId,
        // Campos temporales (mantener compatibilidad)
        name: userData.name,
        email: userData.email,
      }
    })
    
    // FORMATO IDÉNTICO al actual
    const result = {
      id: user.id,
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      role: user.role,
      clinicId: user.clinicId,
      systemId: user.systemId,
      firstName: person.firstName,
      lastName: person.lastName,
      phone: person.phone,
      avatar: person.avatar,
      personId: person.id,
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
  }
}
```

### **Fase 3: Casos de Uso Avanzados (Aprovechando Person)**

#### **3.1 Empleado que también es Cliente**
```typescript
/**
 * 👥 CASO DE USO: User (empleado) que también es Client
 * Ahora es posible porque ambos usan Person como base
 */
async function createEmployeeClient(personData: any) {
  // 1. Crear Person base
  const person = await prisma.person.create({
    data: {
      systemId: personData.systemId,
      firstName: personData.firstName,
      lastName: personData.lastName,
      email: personData.email,
      phone: personData.phone,
    }
  })
  
  // 2. Crear User (empleado) - TABLA EXISTENTE
  const employee = await prisma.user.create({
    data: {
      personId: person.id,
      role: personData.role,
      clinicId: personData.clinicId,
      systemId: personData.systemId,
    }
  })
  
  // 3. Crear Client (mismo Person) - SI ES NECESARIO
  if (personData.isAlsoClient) {
    const client = await prisma.client.create({
      data: {
        personId: person.id, // Mismo Person
        clientNumber: personData.clientNumber,
        clinicId: personData.clinicId,
        systemId: personData.systemId,
      }
    })
    
    return { person, employee, client }
  }
  
  return { person, employee }
}
```

#### **3.2 Búsqueda Unificada**
```typescript
/**
 * 🔍 BÚSQUEDA: Encontrar persona independientemente del rol
 */
async function searchPersonsWithRoles(query: string, systemId: string) {
  const persons = await prisma.person.findMany({
    where: {
      systemId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ]
    },
    include: {
      employee: true,  // User (empleado)
      client: true,    // Client
    }
  })
  
  return persons.map(person => ({
    id: person.id,
    name: `${person.firstName} ${person.lastName}`,
    email: person.email,
    phone: person.phone,
    avatar: person.avatar,
    roles: {
      isEmployee: !!person.employee,
      isClient: !!person.client,
      employeeId: person.employee?.id,
      clientId: person.client?.id,
    }
  }))
}
```

## 📋 **PLAN DE IMPLEMENTACIÓN SIMPLIFICADO**

### **Sprint 1: Adaptación de Schema (1 día)**
- [ ] Agregar campo `personId` a tabla `users`
- [ ] Ejecutar script de migración de datos
- [ ] Verificar integridad relacional

### **Sprint 2: Adaptar APIs Internas (1 día)**
- [ ] Modificar lógica interna de `/api/users/`
- [ ] Mantener formato de respuesta idéntico
- [ ] Testing: verificar que frontend sigue funcionando

### **Sprint 3: Casos Avanzados (1 día)**
- [ ] Implementar empleado-cliente
- [ ] Búsqueda unificada
- [ ] Optimizar queries con includes

### **Sprint 4: Limpieza Gradual (opcional)**
- [ ] Deprecar campos `name` y `email` en User
- [ ] Documentar nuevas capacidades

## ✅ **BENEFICIOS DE ESTA ESTRATEGIA CORREGIDA**

### **🎯 Ventajas Principales:**
1. **CERO cambios en frontend**: APIs mantienen mismo formato
2. **CERO refactorización**: Hooks, contextos, importaciones intactos
3. **Aprovecha Person existente**: Datos centralizados
4. **Roles múltiples**: Empleado puede ser cliente
5. **Migración mínima**: Solo adaptar tabla existente
6. **Escalable**: Fácil agregar más tipos de Person

### **⚠️ Consideraciones:**
1. **Campos temporales**: `name` y `email` en User gradualmente obsoletos
2. **Queries adaptadas**: Incluir `person` en consultas
3. **Validaciones**: Asegurar integridad Person ↔ User

## 🔧 **CONTEXTOS REACT: CERO CAMBIOS**

```typescript
// contexts/auth-context.tsx - NO REQUIERE CAMBIOS
// Las APIs siguen devolviendo el mismo formato:
const user = {
  id: 1,
  name: "Juan Pérez",
  email: "juan@example.com", 
  role: "admin",
  clinicId: 123,
  systemId: "clinic-123",
  
  // Campos adicionales disponibles (sin romper compatibilidad)
  firstName: "Juan",
  lastName: "Pérez", 
  phone: "+34 123 456 789",
  personId: "person-xyz"
}
```

¿Esta estrategia refleja correctamente tu visión de adaptar la tabla Users existente con mínimos cambios?