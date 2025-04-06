import { PrismaClient } from '@prisma/client'

// Evitar múltiples instancias en desarrollo con hot-reloading
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') global.prisma = prisma 