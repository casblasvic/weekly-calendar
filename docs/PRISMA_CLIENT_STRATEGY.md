# 🔧 ESTRATEGIA DE CLIENTE PRISMA - SINGLETON GLOBAL

## 📋 Resumen

Este proyecto utiliza un **patrón singleton** para PrismaClient para optimizar las conexiones a la base de datos y evitar problemas de límites de conexión, especialmente en desarrollo.

## 🎯 Archivo Principal: `lib/db.ts`

### ✅ **IMPORTACIÓN CORRECTA (OBLIGATORIA)**
```typescript
// ✅ SIEMPRE usar esta importación
import { prisma, Prisma } from '@/lib/db';

// ❌ NUNCA usar importación directa
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### 🔧 **Características del Singleton**

**1. Instancia Única Global:**
- Una sola instancia de PrismaClient para toda la aplicación
- Reutilización en desarrollo para evitar límites de conexión
- Configuración centralizada de logging

**2. Configuración Optimizada:**
```typescript
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'], // Solo errores para evitar spam en consola
});
```

**3. Exportaciones Disponibles:**
- `prisma`: Instancia singleton de PrismaClient
- `Prisma`: Namespace con tipos y utilidades
- `PrismaClient`: Tipo del cliente (para typing)
- `disconnectPrisma()`: Función de desconexión controlada

## 📍 Ubicaciones de Uso

### ✅ **Dónde Usar el Singleton**
- **APIs de Next.js** (`app/api/*`)
- **Server Actions** (`actions/*`)
- **Scripts de migración** (`prisma/*`)
- **Servicios del servidor** (`lib/*`)
- **Hooks del servidor** (`lib/hooks/*`)
- **Contextos del servidor** (`contexts/*`)

### 🔧 **Ejemplos de Uso Correcto**

**API Route:**
```typescript
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}
```

**Server Action:**
```typescript
import { prisma } from '@/lib/db';

export async function createUser(data: UserData) {
  return await prisma.user.create({ data });
}
```

**Servicio:**
```typescript
import { prisma } from '@/lib/db';

export class UserService {
  static async findById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  }
}
```

## ⚠️ **Reglas Importantes**

### 🚫 **NO Hacer**
1. **No crear múltiples instancias:**
   ```typescript
   // ❌ INCORRECTO
   const prisma = new PrismaClient();
   ```

2. **No llamar $disconnect() en APIs:**
   ```typescript
   // ❌ INCORRECTO en APIs de Next.js
   await prisma.$disconnect();
   ```

3. **No importar PrismaClient directamente:**
   ```typescript
   // ❌ INCORRECTO
   import { PrismaClient } from '@prisma/client';
   ```

### ✅ **Sí Hacer**
1. **Usar la instancia singleton:**
   ```typescript
   // ✅ CORRECTO
   import { prisma } from '@/lib/db';
   ```

2. **Usar tipos del namespace Prisma:**
   ```typescript
   // ✅ CORRECTO
   import { prisma, Prisma } from '@/lib/db';
   
   type UserCreateInput = Prisma.UserCreateInput;
   ```

3. **Desconectar solo en scripts que terminan:**
   ```typescript
   // ✅ CORRECTO en scripts de migración
   import { disconnectPrisma } from '@/lib/db';
   
   async function migrate() {
     // ... lógica de migración
     await disconnectPrisma();
   }
   ```

## 🔄 **Migración Realizada**

### 📊 **Estadísticas de Migración**
- **Total de archivos TS/JS:** 491
- **Archivos migrados:** 95
- **Archivos sin cambios:** 396

### 🔧 **Archivos Principales Migrados**
- Todas las APIs (`app/api/*`)
- Servicios de backend (`lib/*`)
- Scripts de Prisma (`prisma/*`)
- Hooks del servidor (`lib/hooks/*`)
- Ejemplos y utilidades

## 🎯 **Beneficios del Singleton**

### 🚀 **Rendimiento**
- **Reutilización de conexiones** en desarrollo
- **Menor overhead** de inicialización
- **Pool de conexiones optimizado**

### 🛡️ **Estabilidad**
- **Evita límites de conexión** en desarrollo
- **Consistencia** en transacciones
- **Manejo centralizado** de errores

### 🔧 **Mantenimiento**
- **Configuración centralizada**
- **Logging unificado**
- **Fácil debugging**

## 🔗 **Referencias**

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Next.js with Prisma Best Practices](https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices)

---

## 🆔 **Identificación del Archivo**
- **Archivo:** `lib/db.ts`
- **Propósito:** Singleton de PrismaClient
- **Importación:** `import { prisma, Prisma } from '@/lib/db';`
- **Estado:** ✅ Implementado y migrado completamente 