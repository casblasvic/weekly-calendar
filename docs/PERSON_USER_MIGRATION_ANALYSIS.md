# 📋 **ANÁLISIS DE MIGRACIÓN: Users → PersonEmployee**

## 🎯 **OBJETIVO**
Migrar el concepto de **Users** (que realmente son empleados) para que sea una extensión del modelo **Person** existente, permitiendo que una persona pueda tener múltiples roles (empleado, cliente, contacto de proveedor, etc.) con el **mínimo de cambios** posibles.

## 📊 **SITUACIÓN ACTUAL DETECTADA**

### **Estructura Existente:**
```
Person (MODELO BASE EXISTENTE)
├── Datos personales globales (firstName, lastName, email, phone, etc.)
├── systemId (multi-tenant)
└── Puede tener múltiples roles:
    ├── Client (YA IMPLEMENTADO)
    ├── User (EMPLEADOS - A MIGRAR)
    └── Contacts (CONTACTOS PROVEEDORES - FUTURO)
```

### **Problema Actual:**
- **Users** están implementados como entidad independiente
- **Users** son realmente **empleados** pero no aprovechan Person como base
- **Duplicación de datos** personales entre User y Person
- **No permite roles múltiples** (ej: empleado que también es cliente)

## 🚀 **ESTRATEGIA DE MIGRACIÓN PROPUESTA**

### **Fase 1: Adaptar Users → PersonEmployee**

#### **1.1 Crear PersonEmployee como extensión**
```prisma
// NUEVO MODELO: PersonEmployee
model PersonEmployee {
  id        String @id @default(cuid())
  systemId  String // Para multi-tenant
  
  // Relación con Person existente
  personId  String @unique
  person    Person @relation(fields: [personId], references: [id], onDelete: Cascade)
  
  // Datos específicos de empleado
  role      String
  clinicId  String
  
  // CLAVE: Mantener relación con User existente durante migración
  userId    Int?    @unique
  user      User?   @relation(fields: [userId], references: [id])
  
  // Metadatos
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("person_employees")
}

// MODELO User EXISTENTE (ADAPTADO para migración gradual)
model User {
  id       Int    @id @default(autoincrement())
  name     String
  email    String
  role     String
  clinicId Int
  systemId String
  
  // NUEVA RELACIÓN con PersonEmployee
  personEmployee PersonEmployee?
  
  @@map("users")
}
```

#### **1.2 Script de Migración de Datos**
```typescript
/**
 * 🔄 MIGRACIÓN: Users → PersonEmployee
 * Migra usuarios existentes al modelo Person + PersonEmployee
 */
async function migrateUsersToPersonEmployees() {
  console.log("🚀 Iniciando migración Users → PersonEmployee...")
  
  const users = await prisma.user.findMany()
  console.log(`📊 Encontrados ${users.length} usuarios a migrar`)
  
  for (const user of users) {
    try {
      // 1. Buscar si ya existe Person con el mismo email
      let person = await prisma.person.findFirst({
        where: {
          email: user.email,
          systemId: user.systemId
        }
      })
      
      // 2. Si no existe, crear Person
      if (!person) {
        const [firstName, ...lastNameParts] = user.name.split(' ')
        
        person = await prisma.person.create({
          data: {
            systemId: user.systemId,
            firstName: firstName || user.name,
            lastName: lastNameParts.join(' ') || '',
            email: user.email,
            // Migrar otros campos si existen en User
            phone: user.phone || null,
            avatar: user.avatar || null,
          }
        })
        console.log(`✅ Person creado: ${person.firstName} ${person.lastName}`)
      } else {
        console.log(`📝 Person existente encontrado: ${person.firstName} ${person.lastName}`)
      }
      
      // 3. Crear PersonEmployee vinculado
      const personEmployee = await prisma.personEmployee.create({
        data: {
          systemId: user.systemId,
          personId: person.id,
          role: user.role,
          clinicId: user.clinicId.toString(),
          userId: user.id // MANTENER VINCULACIÓN
        }
      })
      
      console.log(`✅ PersonEmployee creado para usuario ID ${user.id}`)
      
    } catch (error) {
      console.error(`❌ Error migrando usuario ${user.id}:`, error)
    }
  }
  
  console.log("🎉 Migración completada")
}
```

### **Fase 2: Adaptación de APIs (Manteniendo Compatibilidad)**

#### **2.1 API Users (Adaptada)**
```typescript
// app/api/users/route.ts - ADAPTADA para usar PersonEmployee
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // NUEVA LÓGICA: Usar PersonEmployee + Person
    const employees = await prisma.personEmployee.findMany({
      include: {
        person: true,
        user: true // Mantener durante transición
      }
    })
    
    // MANTENER FORMATO COMPATIBLE con APIs existentes
    const users = employees.map(emp => ({
      // Formato original User (compatibilidad)
      id: emp.user?.id || parseInt(emp.id.slice(-6), 16), // Fallback numérico
      name: `${emp.person.firstName} ${emp.person.lastName}`,
      email: emp.person.email,
      role: emp.role,
      clinicId: parseInt(emp.clinicId),
      systemId: emp.systemId,
      
      // NUEVOS CAMPOS disponibles
      personId: emp.person.id,
      personEmployeeId: emp.id,
      firstName: emp.person.firstName,
      lastName: emp.person.lastName,
      phone: emp.person.phone,
      avatar: emp.person.avatar,
      
      // Metadatos
      _isNewStructure: true
    }))
    
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Error fetching users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userData = await request.json()
    
    // NUEVA LÓGICA: Crear Person + PersonEmployee
    const person = await prisma.person.create({
      data: {
        systemId: userData.systemId,
        firstName: userData.firstName || userData.name.split(' ')[0],
        lastName: userData.lastName || userData.name.split(' ').slice(1).join(' '),
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
      }
    })
    
    const personEmployee = await prisma.personEmployee.create({
      data: {
        systemId: userData.systemId,
        personId: person.id,
        role: userData.role,
        clinicId: userData.clinicId.toString(),
      }
    })
    
    // FORMATO COMPATIBLE
    const result = {
      id: parseInt(personEmployee.id.slice(-6), 16),
      name: `${person.firstName} ${person.lastName}`,
      email: person.email,
      role: personEmployee.role,
      clinicId: parseInt(personEmployee.clinicId),
      systemId: person.systemId,
      personId: person.id,
      personEmployeeId: personEmployee.id,
      _isNewStructure: true
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Error creating user' }, { status: 500 })
  }
}
```

### **Fase 3: Casos de Uso Avanzados**

#### **3.1 Persona con Múltiples Roles**
```typescript
/**
 * 👥 CASO DE USO: Empleado que también es Cliente
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
  
  // 2. Crear PersonEmployee
  const employee = await prisma.personEmployee.create({
    data: {
      systemId: personData.systemId,
      personId: person.id,
      role: personData.role,
      clinicId: personData.clinicId,
    }
  })
  
  // 3. Crear PersonClient (si también es cliente)
  if (personData.isAlsoClient) {
    const client = await prisma.personClient.create({
      data: {
        systemId: personData.systemId,
        personId: person.id,
        clientNumber: personData.clientNumber,
        clinicId: personData.clinicId,
        notes: personData.clientNotes,
      }
    })
  }
  
  return { person, employee }
}
```

#### **3.2 Búsqueda Unificada de Personas**
```typescript
/**
 * 🔍 BÚSQUEDA UNIFICADA: Cualquier persona independientemente del rol
 */
async function searchAllPersons(query: string, systemId: string) {
  const persons = await prisma.person.findMany({
    where: {
      systemId,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ]
    },
    include: {
      employee: true,
      client: true,
      contact: true, // Futuro: contactos de proveedores
    }
  })
  
  return persons.map(person => ({
    ...person,
    roles: {
      isEmployee: !!person.employee,
      isClient: !!person.client,
      isContact: !!person.contact,
    }
  }))
}
```

## 📋 **PLAN DE IMPLEMENTACIÓN**

### **Sprint 1: Preparación (1-2 días)**
- [ ] Crear modelo PersonEmployee en schema
- [ ] Escribir script de migración
- [ ] Ejecutar migración en desarrollo
- [ ] Verificar integridad de datos

### **Sprint 2: Adaptación APIs (2-3 días)**
- [ ] Adaptar API `/api/users/` manteniendo compatibilidad
- [ ] Adaptar contextos React de usuarios
- [ ] Testing exhaustivo de APIs
- [ ] Verificar que no se rompe funcionalidad existente

### **Sprint 3: Casos Avanzados (1-2 días)**
- [ ] Implementar personas con múltiples roles
- [ ] Crear búsqueda unificada
- [ ] Optimizar queries
- [ ] Documentar cambios

### **Sprint 4: Limpieza (1 día)**
- [ ] Remover campos duplicados
- [ ] Deprecar relaciones antiguas gradualmente
- [ ] Monitoreo y ajustes finales

## ✅ **BENEFICIOS DE ESTA ESTRATEGIA**

### **🎯 Ventajas:**
1. **Mínimos cambios**: APIs existentes siguen funcionando
2. **Datos centralizados**: Información personal en un solo lugar
3. **Roles múltiples**: Una persona puede ser empleado Y cliente
4. **Escalable**: Fácil agregar nuevos tipos (contactos, proveedores)
5. **Consistencia**: Elimina duplicación de datos personales
6. **Migración segura**: Transición gradual sin interrupciones

### **⚠️ Consideraciones:**
1. **Compatibilidad temporal**: Mantener ambas estructuras durante transición
2. **IDs numéricos**: PersonEmployee usará IDs string, puede requerir adaptación
3. **Testing exhaustivo**: Verificar que todas las funcionalidades siguen funcionando

## 🔧 **ADAPTACIONES NECESARIAS EN FRONTEND**

### **Contextos React (Mínimos cambios)**
```typescript
// contexts/auth-context.tsx - ADAPTADO
const user = {
  // Compatibilidad con estructura antigua
  id: userData.id,
  name: userData.name,
  email: userData.email,
  role: userData.role,
  clinicId: userData.clinicId,
  
  // NUEVOS campos disponibles
  personId: userData.personId,
  firstName: userData.firstName,
  lastName: userData.lastName,
  phone: userData.phone,
  avatar: userData.avatar,
  
  // Indicador de nueva estructura
  _isNewStructure: userData._isNewStructure || false
}
```

¿Te parece ahora una estrategia más acertada basada en tu estructura existente de Person?