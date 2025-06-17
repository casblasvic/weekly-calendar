import { prisma } from '@/lib/db';

/**
 * Verifica si un usuario tiene un permiso específico
 * @param userId ID del usuario
 * @param action Acción del permiso (ej: 'delete', 'validate')
 * @param module Módulo del permiso (ej: 'appointments', 'tickets')
 * @returns true si el usuario tiene el permiso, false si no
 */
export async function userHasPermission(
  userId: string,
  action: string,
  module: string
): Promise<boolean> {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    // Verificar si alguno de los roles del usuario tiene el permiso
    for (const userRole of userRoles) {
      const hasPermission = userRole.role.permissions.some(
        rp => rp.permission.action === action && rp.permission.module === module
      );
      
      if (hasPermission) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Permisos predefinidos para el sistema
 */
export const PERMISSIONS = {
  APPOINTMENTS: {
    VALIDATE: { action: 'validate', module: 'appointments' },
    DELETE_VALIDATED: { action: 'delete_validated', module: 'appointments' },
    MODIFY_VALIDATED: { action: 'modify_validated', module: 'appointments' }
  },
  TICKETS: {
    CREATE: { action: 'create', module: 'tickets' },
    DELETE: { action: 'delete', module: 'tickets' },
    MODIFY: { action: 'modify', module: 'tickets' }
  },
  CASH_SESSIONS: {
    OPEN: { action: 'open', module: 'cash_sessions' },
    CLOSE: { action: 'close', module: 'cash_sessions' },
    RECONCILE: { action: 'reconcile', module: 'cash_sessions' }
  }
};

/**
 * Obtiene todos los permisos de un usuario
 * @param userId ID del usuario
 * @returns Array de permisos con action y module
 */
export async function getUserPermissions(userId: string) {
  try {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    const permissions: Array<{ action: string; module: string }> = [];
    
    userRoles.forEach(userRole => {
      userRole.role.permissions.forEach(rp => {
        // Evitar duplicados
        if (!permissions.some(p => 
          p.action === rp.permission.action && 
          p.module === rp.permission.module
        )) {
          permissions.push({
            action: rp.permission.action,
            module: rp.permission.module
          });
        }
      });
    });

    return permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}
