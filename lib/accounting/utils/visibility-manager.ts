/**
 * Utilidad para gestionar la visibilidad de cuentas contables
 * después de importar la configuración máxima
 */

import { prisma } from '@/lib/db';

export interface VisibilityPreset {
  name: string;
  description: string;
  hiddenAccountPrefixes: string[];
  hiddenPaymentMethods: string[];
}

/**
 * Presets predefinidos para diferentes tipos de negocio
 */
export const VISIBILITY_PRESETS: Record<string, VisibilityPreset> = {
  SMALL_SERVICE: {
    name: 'Pequeño negocio de servicios',
    description: 'Oculta cuentas de inventario, nóminas y activos fijos',
    hiddenAccountPrefixes: [
      '300', // Mercaderías
      '600', // Compras de mercaderías
      '700', // Ventas de mercaderías
      '640', // Sueldos y salarios
      '642', // Seguridad Social
      '280', // Amortización acumulada
      '281', // Amortización inmaterial
      '680', // Dotación amortización
      '681', // Dotación amortización inmaterial
      '431', // Efectos comerciales
      '436', // Clientes dudoso cobro
      '490', // Deterioro créditos
      '650'  // Pérdidas créditos
    ],
    hiddenPaymentMethods: ['CHECK', 'ONLINE_GATEWAY']
  },
  
  RETAIL_CASH: {
    name: 'Comercio minorista efectivo',
    description: 'Enfocado en ventas en efectivo, oculta pagos online y efectos',
    hiddenAccountPrefixes: [
      '640', // Nóminas (si no tienen empleados)
      '642', // Seguridad Social
      '431', // Efectos comerciales
      '436', // Clientes dudoso cobro
      '705'  // Servicios (si solo venden productos)
    ],
    hiddenPaymentMethods: ['ONLINE_GATEWAY', 'CHECK', 'DEFERRED_PAYMENT']
  },
  
  ONLINE_BUSINESS: {
    name: 'Negocio online',
    description: 'Comercio electrónico sin tienda física',
    hiddenAccountPrefixes: [
      '570001', // Cajas por centro (sin múltiples ubicaciones)
      '570002',
      '570003',
      '570004',
      '570005'
    ],
    hiddenPaymentMethods: ['CASH', 'CHECK']
  },
  
  PROFESSIONAL_SERVICES: {
    name: 'Servicios profesionales',
    description: 'Consultoría, asesoría, freelance',
    hiddenAccountPrefixes: [
      '300', // Mercaderías
      '600', // Compras
      '700', // Ventas productos
      '280', // Amortizaciones (mínimas)
      '281'
    ],
    hiddenPaymentMethods: ['INTERNAL_CREDIT']
  }
};

/**
 * Aplica un preset de visibilidad a una entidad legal
 */
export async function applyVisibilityPreset(
  legalEntityId: string,
  presetKey: keyof typeof VISIBILITY_PRESETS
): Promise<{
  accountsHidden: number;
  paymentMethodsHidden: number;
}> {
  const preset = VISIBILITY_PRESETS[presetKey];
  if (!preset) {
    throw new Error(`Preset ${presetKey} no encontrado`);
  }
  
  // Ocultar cuentas según prefijos
  let accountsHidden = 0;
  for (const prefix of preset.hiddenAccountPrefixes) {
    const result = await prisma.chartOfAccountEntry.updateMany({
      where: {
        legalEntityId,
        accountNumber: {
          startsWith: prefix
        }
      },
      data: {
        isVisible: false
      }
    });
    accountsHidden += result.count;
  }
  
  // Ocultar métodos de pago
  const { count: paymentMethodsHidden } = await prisma.paymentMethod.updateMany({
    where: {
      legalEntityId,
      type: {
        in: preset.hiddenPaymentMethods
      }
    },
    data: {
      isVisible: false
    }
  });
  
  return {
    accountsHidden,
    paymentMethodsHidden
  };
}

/**
 * Muestra todas las cuentas y métodos de pago
 */
export async function showAllItems(legalEntityId: string): Promise<void> {
  await prisma.chartOfAccountEntry.updateMany({
    where: { legalEntityId },
    data: { isVisible: true }
  });
  
  await prisma.paymentMethod.updateMany({
    where: { legalEntityId },
    data: { isVisible: true }
  });
}

/**
 * Oculta cuentas sin movimientos
 */
export async function hideUnusedAccounts(
  legalEntityId: string,
  daysThreshold: number = 90
): Promise<number> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  
  // Buscar cuentas sin movimientos recientes
  const unusedAccounts = await prisma.chartOfAccountEntry.findMany({
    where: {
      legalEntityId,
      isVisible: true,
      // No tiene transacciones después de la fecha umbral
      accountingEntries: {
        none: {
          transaction: {
            transactionDate: {
              gte: thresholdDate
            }
          }
        }
      },
      // No es cuenta padre de otras cuentas visibles
      subAccounts: {
        none: {
          isVisible: true
        }
      }
    }
  });
  
  // Ocultar las cuentas sin uso
  const accountIds = unusedAccounts.map(a => a.id);
  const { count } = await prisma.chartOfAccountEntry.updateMany({
    where: {
      id: { in: accountIds }
    },
    data: {
      isVisible: false
    }
  });
  
  return count;
}

/**
 * Obtener estadísticas de visibilidad
 */
export async function getVisibilityStats(legalEntityId: string): Promise<{
  totalAccounts: number;
  visibleAccounts: number;
  hiddenAccounts: number;
  totalPaymentMethods: number;
  visiblePaymentMethods: number;
  hiddenPaymentMethods: number;
}> {
  const [
    totalAccounts,
    visibleAccounts,
    totalPaymentMethods,
    visiblePaymentMethods
  ] = await Promise.all([
    prisma.chartOfAccountEntry.count({ where: { legalEntityId } }),
    prisma.chartOfAccountEntry.count({ where: { legalEntityId, isVisible: true } }),
    prisma.paymentMethod.count({ where: { legalEntityId } }),
    prisma.paymentMethod.count({ where: { legalEntityId, isVisible: true } })
  ]);
  
  return {
    totalAccounts,
    visibleAccounts,
    hiddenAccounts: totalAccounts - visibleAccounts,
    totalPaymentMethods,
    visiblePaymentMethods,
    hiddenPaymentMethods: totalPaymentMethods - visiblePaymentMethods
  };
}

/**
 * Crear preset personalizado basado en el uso actual
 */
export async function createCustomPresetFromUsage(
  legalEntityId: string,
  name: string,
  description: string
): Promise<VisibilityPreset> {
  // Obtener cuentas ocultas
  const hiddenAccounts = await prisma.chartOfAccountEntry.findMany({
    where: {
      legalEntityId,
      isVisible: false,
      level: 1 // Solo cuentas de primer nivel para los prefijos
    },
    select: {
      accountNumber: true
    }
  });
  
  // Obtener métodos de pago ocultos
  const hiddenMethods = await prisma.paymentMethod.findMany({
    where: {
      legalEntityId,
      isVisible: false
    },
    select: {
      type: true
    }
  });
  
  return {
    name,
    description,
    hiddenAccountPrefixes: [...new Set(hiddenAccounts.map(a => a.accountNumber))],
    hiddenPaymentMethods: [...new Set(hiddenMethods.map(m => m.type))]
  };
}
