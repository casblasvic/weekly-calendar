/**
 * API para obtener items sin mapear a cuentas contables
 * Respeta la jerarquía: LegalEntity → Clinics → Tariffs → Items
 * Controla correctamente cuando no hay datos disponibles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Tipos para las respuestas
interface BaseResponse {
  hasData: boolean;
  reason?: string;
  items: any[];
}

interface CategoryMapping {
  categoryId: string;
  categoryName: string;
  hasServices: boolean;
  hasProducts: boolean;
  serviceCount: number;
  productCount: number;
  account: string | null;
  parentId?: string | null;
  level?: number;
  path?: string;
}

interface PaymentMapping {
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodCode: string;
  type: string;
  account: string | null;
}

interface VATMapping {
  vatTypeId: string;
  vatTypeName: string;
  vatRate: number;
  inputAccount: string | null;
  outputAccount: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // category, payment, vat, expense, cash-session, discount
    const legalEntityId = searchParams.get('legalEntityId');

    if (!type || !legalEntityId) {
      return NextResponse.json(
        { error: 'type y legalEntityId son requeridos' }, 
        { status: 400 }
      );
    }

    const systemId = session.user.systemId;

    // VALIDACIÓN INICIAL: Verificar que la entidad legal existe y tiene clínicas
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId
      },
      include: {
        clinics: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            tariffId: true
          }
        }
      }
    });

    if (!legalEntity) {
      return NextResponse.json({
        hasData: false,
        reason: 'legal_entity_not_found',
        items: []
      });
    }

    if (legalEntity.clinics.length === 0) {
      return NextResponse.json({
        hasData: false,
        reason: 'no_clinics_assigned',
        items: []
      });
    }

    const clinicIds = legalEntity.clinics.map(c => c.id);
    const tariffIds = legalEntity.clinics.map(c => c.tariffId);

    // Determinar qué tipo de elementos buscar
    switch (type) {
      case 'category':
        // Verificar que las tarifas tengan categorías con servicios/productos
        const categoriesWithServices = await prisma.category.findMany({
          where: {
            systemId,
            services: {
              some: {
                tariffPrices: {
                  some: {
                    tariffId: { in: tariffIds },
                    isActive: true
                  }
                }
              }
            }
          },
          include: {
            categoryAccountMappings: {
              where: {
                legalEntityId
              }
            },
            services: {
              where: {
                tariffPrices: {
                  some: {
                    tariffId: { in: tariffIds },
                    isActive: true
                  }
                }
              }
            },
            products: true
          }
        });

        const categoriesWithProducts = await prisma.category.findMany({
          where: {
            systemId,
            products: {
              some: {
                productPrices: {
                  some: {
                    tariffId: { in: tariffIds },
                    isActive: true
                  }
                }
              }
            }
          },
          include: {
            categoryAccountMappings: {
              where: {
                legalEntityId
              }
            },
            services: true,
            products: {
              where: {
                productPrices: {
                  some: {
                    tariffId: { in: tariffIds },
                    isActive: true
                  }
                }
              }
            }
          }
        });

        // Combinar y eliminar duplicados
        const allCategories = [...categoriesWithServices, ...categoriesWithProducts];
        const uniqueCategories = Array.from(
          new Map(allCategories.map(cat => [cat.id, cat])).values()
        );

        if (uniqueCategories.length === 0) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_categories_in_tariffs',
            items: []
          });
        }

        // Filtrar solo las que no tienen mapeo
        const unmappedCategories = uniqueCategories.filter(cat => 
          cat.categoryAccountMappings.length === 0
        );

        const categoryMappings: CategoryMapping[] = unmappedCategories.map(cat => {
          const servicesInTariff = cat.services?.length || 0;
          const productsInTariff = cat.products?.length || 0;
          
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            hasServices: servicesInTariff > 0,
            hasProducts: productsInTariff > 0,
            serviceCount: servicesInTariff,
            productCount: productsInTariff,
            account: null,
            parentId: cat.parentId,
            level: 0
          };
        });

        return NextResponse.json({
          hasData: categoryMappings.length > 0,
          reason: categoryMappings.length === 0 ? 'all_categories_mapped' : undefined,
          items: categoryMappings
        });

      case 'payment':
        // SIMPLIFICADO: Obtener TODOS los métodos de pago activos del sistema
        // Los métodos globales son simplemente todos los que están activos
        const paymentMethods = await prisma.paymentMethodDefinition.findMany({
          where: {
            systemId,
            isActive: true
          },
          include: {
            paymentMethodAccountMappings: {
              where: {
                legalEntityId
              }
            }
          }
        });

        // Si no hay métodos de pago en absoluto
        if (paymentMethods.length === 0) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_payment_methods_available',
            items: []
          });
        }

        // Filtrar solo los que no tienen mapeo
        const unmappedPaymentMethods = paymentMethods.filter(pm => 
          pm.paymentMethodAccountMappings.length === 0
        );

        const paymentMappings: PaymentMapping[] = unmappedPaymentMethods.map(pm => ({
          paymentMethodId: pm.id,
          paymentMethodName: pm.name,
          paymentMethodCode: pm.code || '',
          type: pm.type,
          account: null
        }));

        return NextResponse.json({
          hasData: paymentMappings.length > 0,
          reason: paymentMappings.length === 0 ? 'all_payment_methods_mapped' : undefined,
          items: paymentMappings
        });

      case 'vat':
        // Obtener tipos de IVA de las tarifas
        const tariffs = await prisma.tariff.findMany({
          where: {
            id: { in: tariffIds }
          },
          include: {
            vatType: true
          }
        });

        if (tariffs.length === 0) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_tariffs_found',
            items: []
          });
        }

        // IVA de las tarifas (obligatorio)
        const tariffVatIds = tariffs.map(t => t.vatTypeId);

        // IVA de precios específicos en las tarifas
        const servicePricesVat = await prisma.tariffServicePrice.findMany({
          where: {
            tariffId: { in: tariffIds },
            vatTypeId: { not: null }
          },
          select: { vatTypeId: true }
        });

        const productPricesVat = await prisma.tariffProductPrice.findMany({
          where: {
            tariffId: { in: tariffIds },
            vatTypeId: { not: null }
          },
          select: { vatTypeId: true }
        });

        // Combinar todos los IDs de IVA únicos
        const allVatIds = [...new Set([
          ...tariffVatIds,
          ...servicePricesVat.map(sp => sp.vatTypeId).filter(Boolean),
          ...productPricesVat.map(pp => pp.vatTypeId).filter(Boolean)
        ])] as string[];

        // También incluir IVA específico de la entidad legal
        const vatTypes = await prisma.vATType.findMany({
          where: {
            OR: [
              { id: { in: allVatIds } }, // IVA usado en las tarifas
              { legalEntityId, systemId } // IVA específico de la entidad
            ]
          },
          include: {
            vatTypeAccountMappings: {
              where: {
                legalEntityId
              }
            }
          },
          orderBy: {
            rate: 'asc'
          }
        });

        if (vatTypes.length === 0) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_vat_types_in_tariffs',
            items: []
          });
        }

        // Filtrar solo los que no tienen mapeo completo
        const unmappedVatTypes = vatTypes.filter(vat => {
          const mapping = vat.vatTypeAccountMappings[0];
          return !mapping || !mapping.inputAccountId || !mapping.outputAccountId;
        });

        const vatMappings: VATMapping[] = unmappedVatTypes.map(vat => {
          const mapping = vat.vatTypeAccountMappings[0];
          return {
            vatTypeId: vat.id,
            vatTypeName: vat.name,
            vatRate: vat.rate,
            inputAccount: mapping?.inputAccountId || null,
            outputAccount: mapping?.outputAccountId || null
          };
        });

        return NextResponse.json({
          hasData: vatMappings.length > 0,
          reason: vatMappings.length === 0 ? 'all_vat_types_mapped' : undefined,
          items: vatMappings
        });

      case 'expense':
        // Los tipos de gastos son globales del sistema
        const expenseTypes = await prisma.expenseType.findMany({
          where: {
            systemId,
            isActive: true
          },
          include: {
            accountMappings: {
              where: {
                legalEntityId
              }
            }
          }
        });

        if (expenseTypes.length === 0) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_expense_types_defined',
            items: []
          });
        }

        // Filtrar solo los que no tienen mapeo
        const unmappedExpenseTypes = expenseTypes.filter(et => 
          et.accountMappings.length === 0
        );

        const expenseMappings = unmappedExpenseTypes.map(et => ({
          expenseTypeId: et.id,
          expenseTypeName: et.name,
          expenseTypeCode: et.code,
          account: null
        }));

        return NextResponse.json({
          hasData: expenseMappings.length > 0,
          reason: expenseMappings.length === 0 ? 'all_expense_types_mapped' : undefined,
          items: expenseMappings
        });

      case 'cash-session':
        // Solo clínicas de esta entidad legal
        const clinicsForCash = legalEntity.clinics;

        // Terminales POS asignados a las clínicas
        const clinicPaymentSettingsWithTerminals = await prisma.clinicPaymentSetting.findMany({
          where: {
            clinicId: { in: clinicIds },
            posTerminalId: { not: null }
          },
          include: {
            posTerminal: {
              where: {
                isActive: true
              }
            }
          }
        });

        const activeTerminals = clinicPaymentSettingsWithTerminals
          .filter(cps => cps.posTerminal)
          .map(cps => cps.posTerminal!);

        // Obtener mapeos existentes
        const cashMappings = await prisma.cashSessionAccountMapping.findMany({
          where: {
            legalEntityId,
            systemId
          }
        });

        // Filtrar elementos no mapeados
        const unmappedClinics = clinicsForCash.filter(clinic => 
          !cashMappings.some(m => m.clinicId === clinic.id && !m.posTerminalId)
        );

        const unmappedTerminals = activeTerminals.filter(terminal => 
          !cashMappings.some(m => m.posTerminalId === terminal.id)
        );

        const totalUnmapped = unmappedClinics.length + unmappedTerminals.length;

        if (totalUnmapped === 0 && (clinicsForCash.length === 0 && activeTerminals.length === 0)) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_cash_entities_to_map',
            items: []
          });
        }

        const cashSessionMappings = [
          ...unmappedClinics.map(clinic => ({
            type: 'clinic' as const,
            id: clinic.id,
            name: clinic.name,
            account: null
          })),
          ...unmappedTerminals.map(terminal => ({
            type: 'terminal' as const,
            id: terminal.id,
            name: `${terminal.name} (${terminal.provider || 'Sin proveedor'})`,
            account: null
          }))
        ];

        return NextResponse.json({
          hasData: cashSessionMappings.length > 0,
          reason: cashSessionMappings.length === 0 ? 'all_cash_entities_mapped' : undefined,
          items: cashSessionMappings
        });

      case 'discount':
        // Solo obtener promociones reales (NO inventar tipos de descuento)
        const promotions = await prisma.promotion.findMany({
          where: {
            systemId,
            isActive: true,
            OR: [
              // Promociones globales (sin alcance específico)
              {
                applicableClinics: {
                  none: {}
                }
              },
              // Promociones asignadas a las clínicas de esta entidad legal
              {
                applicableClinics: {
                  some: {
                    clinicId: { in: clinicIds }
                  }
                }
              }
            ]
          },
          select: {
            id: true,
            code: true,
            name: true
          }
        });

        if (promotions.length === 0) {
          return NextResponse.json({
            hasData: false,
            reason: 'no_promotions_available',
            items: []
          });
        }

        // Obtener mapeos existentes
        const discountMappings = await prisma.discountTypeAccountMapping.findMany({
          where: {
            legalEntityId,
            systemId
          }
        });

        // Solo mapear promociones que tengan código y no estén ya mapeadas
        const promotionsWithCode = promotions.filter(p => p.code);
        const unmappedPromotions = promotionsWithCode.filter(p => 
          !discountMappings.some(m => m.discountTypeCode === `PROMO_${p.code}`)
        );

        const discountTypeMappings = unmappedPromotions.map(p => ({
          discountTypeCode: `PROMO_${p.code}`,
          discountTypeName: `Promoción: ${p.name}`,
          account: null
        }));

        return NextResponse.json({
          hasData: discountTypeMappings.length > 0,
          reason: discountTypeMappings.length === 0 ? 'all_promotions_mapped' : undefined,
          items: discountTypeMappings
        });

      default:
        return NextResponse.json(
          { error: 'Tipo no válido. Use: category, payment, vat, expense, cash-session, discount' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching unmapped items:', error);
    return NextResponse.json(
      { error: 'Error al obtener elementos sin mapear' },
      { status: 500 }
    );
  }
} 