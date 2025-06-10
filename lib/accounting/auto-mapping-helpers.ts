import { getCountrySpecificAccounts } from '@/lib/accounting/country-accounts';
import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

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
    const countryCode = legalEntity.countryIsoCode || 'ES';
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
    const countryCode = legalEntity.countryIsoCode || 'ES';
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
    const countryCode = legalEntity.countryIsoCode || 'ES';
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
      const accountCode = bankAccount.accountName?.slice(-4) || 'XXXX';
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
            name: `${bankAccount.bank?.name || 'Banco'} - ${bankAccount.accountName || 'Cuenta'}`,
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
      console.log('[autoMapBankAccount] Creado mapeo para cuenta bancaria:', bankAccount.accountName, '-> cuenta:', subaccountNumber);
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

/**
 * Mapea automáticamente el TIPO de promoción a cuentas contables cuando se crea una nueva promoción
 * NO mapea promociones individuales, solo verifica/crea mapeos para el tipo
 */
export async function autoMapPromotion(
  tx: TransactionClient,
  promotionId: string,
  systemId: string
) {
  console.log('[autoMapPromotion] Iniciando mapeo automático para promoción:', promotionId);

  // Obtener la promoción con sus clínicas aplicables
  const promotion = await tx.promotion.findUnique({
    where: { id: promotionId },
    include: {
      applicableClinics: {
        include: {
          clinic: {
            include: {
              legalEntity: true
            }
          }
        }
      }
    }
  });

  if (!promotion) {
    console.error('[autoMapPromotion] Promoción no encontrada:', promotionId);
    return;
  }

  // Determinar el tipo de descuento a mapear
  // Los tipos PERCENTAGE_DISCOUNT y FIXED_AMOUNT_DISCOUNT se mapean como "descuentos manuales"
  const discountTypeToMap = promotion.type;
  const discountMappingCode = (promotion.type === 'PERCENTAGE_DISCOUNT' || promotion.type === 'FIXED_AMOUNT_DISCOUNT') 
    ? 'MANUAL_DISCOUNT' 
    : promotion.type;

  console.log('[autoMapPromotion] Tipo de promoción:', promotion.type, '- Código de mapeo:', discountMappingCode);

  // Si la promoción es global (sin clínicas específicas), usar todas las clínicas del sistema
  let clinicsToMap = promotion.applicableClinics.map(ac => ac.clinic);
  
  if (clinicsToMap.length === 0) {
    // Promoción global: obtener todas las clínicas del sistema
    const allClinics = await tx.clinic.findMany({
      where: { 
        systemId,
        isActive: true 
      },
      include: {
        legalEntity: true
      }
    });
    clinicsToMap = allClinics;
    console.log('[autoMapPromotion] Promoción global, mapeando para todas las clínicas:', allClinics.length);
  }

  // Procesar cada clínica
  for (const clinic of clinicsToMap) {
    if (!clinic.legalEntity) {
      console.warn('[autoMapPromotion] Clínica sin entidad legal:', clinic.id);
      continue;
    }

    const legalEntity = clinic.legalEntity;

    // Verificar si ya existe mapeo para este tipo de descuento en esta clínica
    const existingMapping = await tx.discountTypeAccountMapping.findFirst({
      where: {
        legalEntityId: legalEntity.id,
        discountTypeCode: discountMappingCode,
        clinicId: clinic.id
      }
    });

    if (existingMapping) {
      console.log('[autoMapPromotion] Ya existe mapeo para código', discountMappingCode, 'en clínica:', clinic.name);
      continue;
    }

    // Obtener las cuentas específicas del país
    const countryAccounts = getCountrySpecificAccounts(legalEntity.countryIsoCode);
    const discountAccountNumber = countryAccounts.discounts;

    if (!discountAccountNumber) {
      console.error('[autoMapPromotion] No se encontró cuenta de descuentos para el país:', legalEntity.countryIsoCode);
      continue;
    }

    // Buscar la cuenta padre de descuentos
    const parentAccount = await tx.chartOfAccountEntry.findFirst({
      where: {
        accountNumber: discountAccountNumber,
        legalEntityId: legalEntity.id
      }
    });

    if (!parentAccount) {
      console.error('[autoMapPromotion] No se encontró cuenta padre de descuentos:', discountAccountNumber);
      continue;
    }

    // Función auxiliar para crear subcuenta de descuento y mapeo
    const createDiscountSubaccountAndMapping = async (
      tx: any,
      clinic: any,
      parentAccount: any,
      discountAccountNumber: string,
      discountMappingCode: string,
      legalEntity: any
    ) => {
      // Usar el mismo formato que la configuración rápida: {cuentaDescuentos}.{codigoClínica}
      const clinicCode = clinic.prefix || clinic.name.substring(0, 4).toUpperCase();
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
        const discountTypeName = getDiscountTypeName(discountMappingCode);
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
            systemId: legalEntity.systemId
          }
        });
        console.log(`[autoMapPromotion] Creada subcuenta ${subaccountNumber} para ${discountTypeName} en ${clinic.name}`);
      }

      // Verificar si ya existe un mapeo para este tipo y clínica
      const existingMapping = await tx.discountTypeAccountMapping.findFirst({
        where: {
          legalEntityId: legalEntity.id,
          discountTypeCode: discountMappingCode,
          clinicId: clinic.id
        }
      });

      if (!existingMapping) {
        // Crear mapeo
        await tx.discountTypeAccountMapping.create({
          data: {
            legalEntityId: legalEntity.id,
            discountTypeId: discountMappingCode,
            discountTypeCode: discountMappingCode,
            discountTypeName: getDiscountTypeName(discountMappingCode),
            clinicId: clinic.id,
            accountId: subaccount.id,
            systemId: legalEntity.systemId
          }
        });
        console.log(`[autoMapPromotion] Creado mapeo para ${discountMappingCode} en ${clinic.name} -> cuenta ${subaccountNumber}`);
      }
      
      return subaccount;
    };

    const subaccount = await createDiscountSubaccountAndMapping(
      tx,
      clinic,
      parentAccount,
      discountAccountNumber,
      discountMappingCode,
      legalEntity
    );

    // Si es un descuento manual, también crear mapeos para los tipos específicos si no existen
    if (discountMappingCode === 'MANUAL_DISCOUNT') {
      const manualDiscountTypes = ['PERCENTAGE_DISCOUNT', 'FIXED_AMOUNT_DISCOUNT'];
      for (const manualType of manualDiscountTypes) {
        if (manualType !== discountTypeToMap) {
          const existingManualMapping = await tx.discountTypeAccountMapping.findFirst({
            where: {
              legalEntityId: legalEntity.id,
              discountTypeCode: manualType,
              clinicId: clinic.id
            }
          });

          if (!existingManualMapping) {
            await tx.discountTypeAccountMapping.create({
              data: {
                legalEntityId: legalEntity.id,
                discountTypeId: manualType,
                discountTypeCode: manualType,
                discountTypeName: getDiscountTypeName(manualType),
                clinicId: clinic.id,
                accountId: subaccount.id,
                systemId: legalEntity.systemId
              }
            });
            console.log(`[autoMapPromotion] Creado mapeo adicional para tipo manual: ${manualType}`);
          }
        }
      }
    }
  }

  console.log('[autoMapPromotion] Mapeo automático completado para promoción:', promotionId);
}

// Función auxiliar para obtener el nombre del tipo de descuento
function getDiscountTypeName(discountType: string): string {
  const names: Record<string, string> = {
    'MANUAL_DISCOUNT': 'Descuentos Manuales',
    'PERCENTAGE_DISCOUNT': 'Descuentos Manuales',
    'FIXED_AMOUNT_DISCOUNT': 'Descuentos Manuales',
    'BUY_X_GET_Y_SERVICE': 'Compra X Obtén Y (Servicios)',
    'BUY_X_GET_Y_PRODUCT': 'Compra X Obtén Y (Productos)',
    'POINTS_MULTIPLIER': 'Multiplicador de Puntos',
    'FREE_SHIPPING': 'Envío Gratuito'
  };
  return names[discountType] || discountType;
}
