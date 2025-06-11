import { PrismaClient, Prisma } from '@prisma/client';
import { getCountrySpecificAccounts } from '@/app/(main)/configuracion/contabilidad/components/plan-contable/quick-setup-actions';

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">;

/**
 * Mapea automáticamente una promoción recién creada
 */
export async function autoMapPromotion(
  tx: TransactionClient,
  promotionId: string,
  systemId: string
) {
  console.log('[autoMapPromotion] Iniciando mapeo automático para promoción:', promotionId);

  try {
    // Obtener la promoción con sus clínicas aplicables
    const promotion = await tx.promotion.findUnique({
      where: { id: promotionId },
      include: {
        applicableClinics: {
          include: {
            clinic: true
          }
        }
      }
    });

    if (!promotion) {
      console.error('[autoMapPromotion] Promoción no encontrada:', promotionId);
      return;
    }

    // Obtener la entidad legal del sistema
    const legalEntity = await tx.legalEntity.findFirst({
      where: { systemId }
    });

    if (!legalEntity) {
      console.error('[autoMapPromotion] Entidad legal no encontrada para sistema:', systemId);
      return;
    }

    // Obtener el país de la entidad legal
    const countryCode = legalEntity.countryCode || 'ES';
    const countryAccounts = getCountrySpecificAccounts(countryCode);
    const discountAccountNumber = countryAccounts.discounts || '7129';

    // Obtener la cuenta padre de descuentos
    const parentAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: discountAccountNumber,
        legalEntityId: legalEntity.id
      }
    });

    if (!parentAccount) {
      console.warn('[autoMapPromotion] No se encontró cuenta padre de descuentos:', discountAccountNumber);
      return;
    }

    // Si la promoción es global o no tiene clínicas específicas
    const clinicsToMap = promotion.applicableClinics.length > 0 
      ? promotion.applicableClinics.map(ac => ac.clinic)
      : await tx.clinic.findMany({ where: { systemId } }); // Mapear a todas las clínicas

    for (const clinic of clinicsToMap) {
      // Verificar si ya existe mapeo
      const existingMapping = await tx.discountTypeAccountMapping.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          discountTypeId: 'MANUAL_DISCOUNT',
          clinicId: clinic.id
        }
      });

      if (!existingMapping) {
        // Crear subcuenta para la clínica
        const clinicCode = clinic.prefix || `CL${clinic.id.slice(-4)}`;
        const subaccountNumber = `${discountAccountNumber}.${clinicCode}`;

        // Buscar si la subcuenta ya existe
        let subaccount = await tx.chartOfAccountEntry.findFirst({
          where: {
            accountNumber: subaccountNumber,
            legalEntityId: legalEntity.id
          }
        });

        // Crear subcuenta si no existe
        if (!subaccount) {
          subaccount = await tx.chartOfAccountEntry.create({
            data: {
              accountNumber: subaccountNumber,
              name: `Descuentos - ${clinic.name}`,
              type: parentAccount.type,
              description: `Subcuenta de descuentos para ${clinic.name}`,
              isSubAccount: true,
              parentAccountId: parentAccount.id,
              isMonetary: false,
              allowsDirectEntry: true,
              isActive: true,
              legalEntityId: legalEntity.id,
              systemId
            }
          });
          console.log('[autoMapPromotion] Creada subcuenta:', subaccountNumber);
        }

        // Crear mapeo
        await tx.discountTypeAccountMapping.create({
          data: {
            legalEntityId: legalEntity.id,
            discountTypeId: 'MANUAL_DISCOUNT',
            discountTypeCode: 'MANUAL_DISCOUNT',
            discountTypeName: 'Descuentos Manuales',
            clinicId: clinic.id,
            accountId: subaccount.id,
            systemId
          }
        });
        console.log('[autoMapPromotion] Creado mapeo para promoción en clínica:', clinic.name);

        // También crear mapeos de compatibilidad para tipos legacy
        const legacyTypes = ['PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT'];
        for (const legacyType of legacyTypes) {
          const existingLegacyMapping = await tx.discountTypeAccountMapping.findFirst({
            where: {
              legalEntityId: legalEntity.id,
              discountTypeId: legacyType,
              clinicId: clinic.id
            }
          });

          if (!existingLegacyMapping) {
            await tx.discountTypeAccountMapping.create({
              data: {
                legalEntityId: legalEntity.id,
                discountTypeId: legacyType,
                discountTypeCode: legacyType,
                discountTypeName: 'Descuentos Manuales',
                clinicId: clinic.id,
                accountId: subaccount.id,
                systemId
              }
            });
          }
        }
      }
    }

    console.log('[autoMapPromotion] Mapeo automático completado para promoción:', promotion.name);
  } catch (error) {
    console.error('[autoMapPromotion] Error en mapeo automático:', error);
  }
}

/**
 * Mapea automáticamente un servicio recién creado
 */
export async function autoMapService(
  tx: TransactionClient,
  serviceId: string,
  systemId: string
) {
  console.log('[autoMapService] Iniciando mapeo automático para servicio:', serviceId);

  try {
    const service = await tx.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      console.error('[autoMapService] Servicio no encontrado:', serviceId);
      return;
    }

    const legalEntity = await tx.legalEntity.findFirst({
      where: { systemId }
    });

    if (!legalEntity) {
      console.error('[autoMapService] Entidad legal no encontrada para sistema:', systemId);
      return;
    }

    // Obtener el país y la cuenta de servicios
    const countryCode = legalEntity.countryCode || 'ES';
    const countryAccounts = getCountrySpecificAccounts(countryCode);
    const serviceAccountNumber = countryAccounts.services || '70501';

    const serviceAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: serviceAccountNumber,
        legalEntityId: legalEntity.id
      }
    });

    if (!serviceAccount) {
      console.warn('[autoMapService] No se encontró cuenta de servicios:', serviceAccountNumber);
      return;
    }

    // Verificar si ya existe mapeo
    const existingMapping = await tx.serviceAccountMapping.findFirst({
      where: {
        legalEntityId: legalEntity.id,
        serviceId: service.id
      }
    });

    if (!existingMapping) {
      await tx.serviceAccountMapping.create({
        data: {
          legalEntityId: legalEntity.id,
          serviceId: service.id,
          accountId: serviceAccount.id,
          systemId
        }
      });
      console.log('[autoMapService] Creado mapeo para servicio:', service.name, '-> cuenta:', serviceAccountNumber);
    }
  } catch (error) {
    console.error('[autoMapService] Error en mapeo automático:', error);
  }
}

/**
 * Mapea automáticamente un producto recién creado
 */
export async function autoMapProduct(
  tx: TransactionClient,
  productId: string,
  systemId: string
) {
  console.log('[autoMapProduct] Iniciando mapeo automático para producto:', productId);

  try {
    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      console.error('[autoMapProduct] Producto no encontrado:', productId);
      return;
    }

    const legalEntity = await tx.legalEntity.findFirst({
      where: { systemId }
    });

    if (!legalEntity) {
      console.error('[autoMapProduct] Entidad legal no encontrada para sistema:', systemId);
      return;
    }

    // Obtener el país y la cuenta de productos
    const countryCode = legalEntity.countryCode || 'ES';
    const countryAccounts = getCountrySpecificAccounts(countryCode);
    const productAccountNumber = countryAccounts.products || '70101';

    const productAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: productAccountNumber,
        legalEntityId: legalEntity.id
      }
    });

    if (!productAccount) {
      console.warn('[autoMapProduct] No se encontró cuenta de productos:', productAccountNumber);
      return;
    }

    // Verificar si ya existe mapeo
    const existingMapping = await tx.productAccountMapping.findFirst({
      where: {
        legalEntityId: legalEntity.id,
        productId: product.id
      }
    });

    if (!existingMapping) {
      await tx.productAccountMapping.create({
        data: {
          legalEntityId: legalEntity.id,
          productId: product.id,
          accountId: productAccount.id,
          systemId
        }
      });
      console.log('[autoMapProduct] Creado mapeo para producto:', product.name, '-> cuenta:', productAccountNumber);
    }
  } catch (error) {
    console.error('[autoMapProduct] Error en mapeo automático:', error);
  }
}

/**
 * Mapea automáticamente una cuenta bancaria recién creada o asociada a una clínica
 */
export async function autoMapBankAccount(
  tx: TransactionClient,
  bankAccountId: string,
  systemId: string
) {
  console.log('[autoMapBankAccount] Iniciando mapeo automático para cuenta bancaria:', bankAccountId);

  try {
    const bankAccount = await tx.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: {
        bank: true,
        applicableClinics: {
          include: {
            clinic: true
          }
        }
      }
    });

    if (!bankAccount) {
      console.error('[autoMapBankAccount] Cuenta bancaria no encontrada:', bankAccountId);
      return;
    }

    const legalEntity = await tx.legalEntity.findFirst({
      where: { systemId }
    });

    if (!legalEntity) {
      console.error('[autoMapBankAccount] Entidad legal no encontrada para sistema:', systemId);
      return;
    }

    // Obtener el país y la cuenta de bancos
    const countryCode = legalEntity.countryCode || 'ES';
    const countryAccounts = getCountrySpecificAccounts(countryCode);
    const bankAccountNumber = countryAccounts.banks || '572';

    const parentAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: bankAccountNumber,
        legalEntityId: legalEntity.id
      }
    });

    if (!parentAccount) {
      console.warn('[autoMapBankAccount] No se encontró cuenta de bancos:', bankAccountNumber);
      return;
    }

    // Verificar si ya existe mapeo
    if (!bankAccount.accountId) {
      // Crear subcuenta específica para la cuenta bancaria
      const bankCode = bankAccount.bank?.code || 'BANK';
      const accountCode = bankAccount.accountNumber?.slice(-4) || 'XXXX';
      const subaccountNumber = `${bankAccountNumber}.${bankCode}.${accountCode}`;

      // Buscar si la subcuenta ya existe
      let subaccount = await tx.chartOfAccountEntry.findFirst({
        where: {
          accountNumber: subaccountNumber,
          legalEntityId: legalEntity.id
        }
      });

      // Crear subcuenta si no existe
      if (!subaccount) {
        subaccount = await tx.chartOfAccountEntry.create({
          data: {
            accountNumber: subaccountNumber,
            name: `${bankAccount.bank?.name || 'Banco'} - ${bankAccount.accountNumber || 'Cuenta'}`,
            type: parentAccount.type,
            description: `Subcuenta bancaria para ${bankAccount.bank?.name}`,
            isSubAccount: true,
            parentAccountId: parentAccount.id,
            isMonetary: true,
            allowsDirectEntry: true,
            isActive: true,
            legalEntityId: legalEntity.id,
            systemId
          }
        });
        console.log('[autoMapBankAccount] Creada subcuenta bancaria:', subaccountNumber);
      }

      // Actualizar cuenta bancaria con el mapeo
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { accountId: subaccount.id }
      });
      console.log('[autoMapBankAccount] Creado mapeo para cuenta bancaria:', bankAccount.accountNumber, '-> cuenta:', subaccountNumber);
    }

    // También mapear el banco si no está mapeado
    if (bankAccount.bank && !bankAccount.bank.accountId) {
      await tx.bank.update({
        where: { id: bankAccount.bank.id },
        data: { accountId: parentAccount.id }
      });
      console.log('[autoMapBankAccount] Creado mapeo para banco:', bankAccount.bank.name, '-> cuenta:', bankAccountNumber);
    }
  } catch (error) {
    console.error('[autoMapBankAccount] Error en mapeo automático:', error);
  }
}
