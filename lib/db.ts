/**
 * ========================================
 * PRISMA CLIENT SINGLETON - INSTANCIA GLOBAL ÚNICA
 * ========================================
 * 
 * 🎯 PROPÓSITO:
 * Esta es la ÚNICA instancia de PrismaClient que debe usarse en toda la aplicación.
 * Implementa el patrón singleton para evitar múltiples conexiones a la base de datos
 * y optimizar el rendimiento.
 * 
 * 🔧 IMPORTACIÓN CORRECTA:
 * SIEMPRE usar: import { prisma } from '@/lib/db';
 * NUNCA usar: import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient();
 * 
 * 📍 UBICACIONES DE USO:
 * - APIs de Next.js (app/api/*)
 * - Server Actions (actions/*)
 * - Scripts de migración (prisma/*)
 * - Servicios del servidor (lib/*)
 * - Seeders (prisma/seed-*.ts)
 * 
 * ⚠️ IMPORTANTE:
 * - En desarrollo: Reutiliza la instancia para evitar límites de conexión
 * - En producción: Una instancia por proceso/lambda
 * - NO llamar a $disconnect() en APIs de Next.js (se maneja automáticamente)
 * 
 * 🔗 DOCUMENTACIÓN:
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 * @see docs/DATABASE_CLIENTS_STRATEGY.md
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Extensión del objeto global para desarrollo
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined 
};

/**
 * 🔧 INSTANCIA SINGLETON DE PRISMA CLIENT
 * 
 * Esta instancia se reutiliza en toda la aplicación para:
 * - Optimizar conexiones a la base de datos
 * - Evitar límites de conexión en desarrollo
 * - Mantener consistencia en transacciones
 * - Centralizar configuración de Prisma
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'], // Solo errores para evitar spam en consola
});

// En desarrollo, guardar la instancia globalmente para hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * 🔧 EXPORTACIÓN DEL NAMESPACE PRISMA
 * 
 * Exportamos el namespace Prisma para acceso a tipos y utilidades:
 * - Tipos generados (User, Clinic, etc.)
 * - Enums (AppointmentStatus, etc.)
 * - Utilidades (Prisma.validator, etc.)
 * - Tipos de error (PrismaClientKnownRequestError, etc.)
 */
export { Prisma };

/**
 * 🔧 TIPOS ÚTILES PARA LA APLICACIÓN
 * 
 * Re-exportamos tipos comunes para facilitar su uso
 */
export type {
  PrismaClient,
} from '@prisma/client';

/**
 * 🔧 FUNCIÓN DE DESCONEXIÓN CONTROLADA
 * 
 * Solo para uso en scripts que terminan (migrations, seeds, etc.)
 * NO usar en APIs de Next.js
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
} 