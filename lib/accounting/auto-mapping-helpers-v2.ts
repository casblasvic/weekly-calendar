import { prisma } from '@/lib/db';
import { getCountryAccounts } from './country-accounts';

/**
 * Mapeo automático de promociones individuales para análisis detallado
 * Crea una subcuenta específica para cada promoción
 */
export async function autoMapPromotionIndividual(
  promotionId: string,
  legalEntityId: string,
  systemId: string
) {
  return await prisma.$transaction(async (tx) => {
    // Obtener la promoción con sus clínicas
    const promotion = await tx.promotion.findUnique({
      where: { id: promotionId },
      include: { 
        clinics: true,
        legalEntity: {
          include: { clinics: true }
        }
      }
    });

    if (!promotion) {
      throw new Error('Promoción no encontrada');
    }

    const legalEntity = promotion.legalEntity;
    const countryAccounts = getCountryAccounts(legalEntity.countryCode);
    
    if (!countryAccounts?.discounts) {
      console.error('[autoMapPromotionIndividual] No hay cuenta de descuentos para el país:', legalEntity.countryCode);
      return;
    }

    const discountAccountNumber = countryAccounts.discounts;
    
    // Obtener cuenta padre de descuentos
    const parentAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: discountAccountNumber,
        legalEntityId: legalEntity.id
      }
    });

    if (!parentAccount) {
      console.error('[autoMapPromotionIndividual] No se encontró cuenta padre de descuentos');
      return;
    }

    // Determinar clínicas a mapear
    const clinicsToMap = promotion.isGlobal 
      ? legalEntity.clinics 
      : promotion.clinics;

    const mappings = [];

    for (const clinic of clinicsToMap) {
      // Formato: {descuentos}.{tipo}.{clínica}.{secuencial}
      const typeCode = getPromotionTypeCode(promotion.type);
      const clinicCode = clinic.prefix || clinic.name.substring(0, 4).toUpperCase();
      
      // Buscar siguiente número secuencial disponible
      const existingAccounts = await tx.chartOfAccountEntry.findMany({
        where: {
          accountNumber: {
            startsWith: `${discountAccountNumber}.${typeCode}.${clinicCode}.`
          },
          legalEntityId: legalEntity.id
        },
        orderBy: { accountNumber: 'desc' }
      });

      let sequentialNumber = '001';
      if (existingAccounts.length > 0) {
        const lastNumber = existingAccounts[0].accountNumber.split('.').pop();
        const nextNumber = (parseInt(lastNumber || '0') + 1).toString().padStart(3, '0');
        sequentialNumber = nextNumber;
      }

      const subaccountNumber = `${discountAccountNumber}.${typeCode}.${clinicCode}.${sequentialNumber}`;

      // Crear subcuenta para la promoción
      const subaccount = await tx.chartOfAccountEntry.create({
        data: {
          accountNumber: subaccountNumber,
          name: `${promotion.name} - ${clinic.name}`,
          type: parentAccount.type,
          description: `Promoción: ${promotion.name} (${promotion.code}) para ${clinic.name}`,
          isSubAccount: true,
          parentAccountId: parentAccount.id,
          isMonetary: false,
          allowsDirectEntry: true,
          isActive: promotion.isActive,
          legalEntityId: legalEntity.id,
          systemId
        }
      });

      // Crear mapeo de promoción individual
      const mapping = await tx.promotionAccountMapping.create({
        data: {
          promotionId: promotion.id,
          accountId: subaccount.id,
          legalEntityId: legalEntity.id,
          clinicId: clinic.id,
          systemId,
          // Metadatos para análisis
          targetRevenue: promotion.targetRevenue,
          targetNewClients: promotion.targetNewClients,
          budgetedDiscount: promotion.budgetedDiscount
        }
      });

      mappings.push(mapping);
      console.log(`[autoMapPromotionIndividual] Creado mapeo para promoción "${promotion.name}" en ${clinic.name} -> cuenta ${subaccountNumber}`);
    }

    return mappings;
  }, {
    timeout: 300000 // 5 minutos para transacciones largas
  });
}

/**
 * Obtener código corto del tipo de promoción
 */
function getPromotionTypeCode(type: string): string {
  const codes: Record<string, string> = {
    'PERCENTAGE_DISCOUNT': 'MANU',
    'FIXED_AMOUNT_DISCOUNT': 'MANU', 
    'BUY_X_GET_Y_SERVICE': '2X1S',
    'BUY_X_GET_Y_PRODUCT': '2X1P',
    'POINTS_MULTIPLIER': 'PNTS',
    'FREE_SHIPPING': 'SHIP'
  };
  return codes[type] || type.substring(0, 4).toUpperCase();
}

/**
 * Archivar cuentas de promociones inactivas
 */
export async function archiveInactivePromotionAccounts() {
  const inactivePromotions = await prisma.promotion.findMany({
    where: { 
      isActive: false,
      OR: [
        { endDate: { lt: new Date() } },
        { AND: [
          { endDate: null },
          { updatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } // 90 días
        ]}
      ]
    },
    include: {
      promotionAccountMappings: {
        include: { account: true }
      }
    }
  });

  for (const promotion of inactivePromotions) {
    for (const mapping of promotion.promotionAccountMappings) {
      await prisma.chartOfAccountEntry.update({
        where: { id: mapping.accountId },
        data: { isActive: false }
      });
    }
  }
}
