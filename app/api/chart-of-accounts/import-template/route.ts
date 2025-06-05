import { prisma } from "@/lib/db";
import { 
  IFRS_AESTHETIC_CLINIC_TEMPLATE,
  COUNTRY_TEMPLATES,
  COUNTRY_VAT_CONFIGS,
  // SECTOR_TEMPLATES,
  type SupportedCountry
} from "@/config/accounting";
import { BusinessSector, type ChartOfAccountTemplateEntry } from '@/types/accounting';
// import { generateMaximumTemplate, generateConfigurationSummary } from '@/lib/accounting/generators/maximum-template-configurator';
import { getServerAuthSession } from "@/lib/auth";
import { NextRequest, NextResponse } from 'next/server';

interface ImportTemplateRequest {
  templateCode: string;
  country: SupportedCountry;
  sector?: BusinessSector;
  systemId: string;
  legalEntityId?: string;
  mode: 'replace' | 'merge';
  businessFeatures?: {
    hasConsultationServices: boolean;
    hasMedicalTreatments: boolean;
    hasHairSalon: boolean;
    hasSpa: boolean;
    sellsProducts: boolean;
    isMultiCenter: boolean;
  };
  locations?: string[];
  allowReplacePlan?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body: ImportTemplateRequest = await request.json();
    const { templateCode, country, sector, systemId, legalEntityId, mode, businessFeatures, locations, allowReplacePlan } = body;

    // Validar que la entidad legal pertenece al sistema
    if (legalEntityId) {
      const legalEntity = await prisma.legalEntity.findFirst({
        where: {
          id: legalEntityId,
          systemId: session.user.systemId
        }
      });

      if (!legalEntity) {
        return NextResponse.json(
          { error: "Entidad legal no encontrada o no pertenece al sistema" },
          { status: 404 }
        );
      }
    }

    // Si el modo es "replace", eliminar las cuentas existentes
    if (mode === 'replace') {
      await prisma.chartOfAccountEntry.deleteMany({
        where: {
          systemId,
          ...(legalEntityId && { legalEntityId })
        }
      });
    }

    // Obtener la plantilla base del país
    const countryTemplate = COUNTRY_TEMPLATES[country];
    if (!countryTemplate) {
      return NextResponse.json(
        { error: "Plantilla de país no encontrada" },
        { status: 404 }
      );
    }

    // Combinar con plantilla de sector si existe
    let template = { ...countryTemplate };
    let additionalAccounts: ChartOfAccountTemplateEntry[] = [];
    let accountModifications: Record<string, any> = {};
    let defaultMappings: { services?: Record<string, string>; products?: Record<string, string> } = {};

    // Determinar cuentas adicionales según el sector
    // Comentado hasta que se implemente SECTOR_TEMPLATES
    /*
    if (sector) {
      const sectorTemplate = SECTOR_TEMPLATES[sector];
      if (sectorTemplate?.accountCustomizations) {
        // Recopilar cuentas adicionales del sector
        if (sectorTemplate.accountCustomizations.additionalAccounts) {
          additionalAccounts = sectorTemplate.accountCustomizations.additionalAccounts;
        }
        // Recopilar modificaciones
        if (sectorTemplate.accountCustomizations.accountModifications) {
          accountModifications = sectorTemplate.accountCustomizations.accountModifications;
        }
      }
    }
    */

    // Validación básica
    if (!template || !template.accounts || template.accounts.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron cuentas en la plantilla' },
        { status: 400 }
      );
    }

    // Si se seleccionó reemplazar el plan existente, eliminar todas las cuentas actuales
    if (allowReplacePlan && legalEntityId) {
      console.log('Eliminando plan contable existente...');
      
      // Primero eliminar los mapeos asociados
      await prisma.paymentMethodAccountMapping.deleteMany({
        where: { legalEntityId }
      });
      
      await prisma.categoryAccountMapping.deleteMany({
        where: { legalEntityId }
      });
      
      await prisma.vATTypeAccountMapping.deleteMany({
        where: { legalEntityId }
      });
      
      await prisma.chartOfAccountEntry.deleteMany({
        where: {
          systemId,
          legalEntityId
        }
      });
      
      console.log('Plan contable existente eliminado');
    }

    // Obtener todas las cuentas (base + modificaciones del sector)
    const allEntries = [...template.accounts, ...additionalAccounts];

    // Importar la configuración de IVA del país
    if (country && COUNTRY_VAT_CONFIGS[country]) {
      const vatConfig = COUNTRY_VAT_CONFIGS[country];
      
      // Crear o actualizar los tipos de IVA
      for (const rate of vatConfig.rates) {
        await prisma.vATType.upsert({
          where: {
            code_systemId: {
              code: rate.code,
              systemId
            }
          },
          update: {
            name: rate.name.es || rate.code,
            rate: rate.rate,
            isDefault: rate.isDefault || false,
            ...(legalEntityId && { legalEntityId })
          },
          create: {
            code: rate.code,
            name: rate.name.es || rate.code,
            rate: rate.rate,
            isDefault: rate.isDefault || false,
            systemId,
            ...(legalEntityId && { legalEntityId })
          }
        });
      }
    }

    // Procesar las entradas de la plantilla
    const createdAccounts = [];
    const accountsByNumber = new Map();

    // Primero, crear todas las cuentas sin las relaciones padre
    for (const entry of allEntries) {
      const existingAccount = await prisma.chartOfAccountEntry.findFirst({
        where: {
          accountNumber: entry.accountNumber,
          systemId,
          ...(legalEntityId && { legalEntityId })
        }
      });

      if (existingAccount && mode === 'merge') {
        accountsByNumber.set(entry.accountNumber, existingAccount);
        continue; // Saltar si ya existe y estamos en modo merge
      }

      // Aplicar modificaciones del sector si existen
      const templateEntry = entry as ChartOfAccountTemplateEntry;
      let accountData = {
        accountNumber: templateEntry.accountNumber,
        name: templateEntry.names.es || templateEntry.names.en || Object.values(templateEntry.names)[0],
        type: templateEntry.type,
        description: templateEntry.description?.es,
        isMonetary: templateEntry.isMonetary ?? false,
        isActive: true,
        allowsDirectEntry: templateEntry.allowsDirectEntry ?? true,
        systemId,
        ...(legalEntityId && { legalEntityId })
      };

      // Si hay modificaciones para esta cuenta, aplicarlas
      if (accountModifications[entry.accountNumber]) {
        const mods = accountModifications[entry.accountNumber];
        if (mods.names?.es) accountData.name = mods.names.es;
        if (mods.description?.es) accountData.description = mods.description.es;
      }

      const account = await prisma.chartOfAccountEntry.create({
        data: accountData
      });

      accountsByNumber.set(entry.accountNumber, account);
      createdAccounts.push(account);
    }

    // Segundo paso: actualizar las relaciones padre-hijo
    for (const entry of allEntries) {
      if (entry.parentNumber) {
        const account = accountsByNumber.get(entry.accountNumber);
        const parentAccount = accountsByNumber.get(entry.parentNumber);
        
        if (account && parentAccount) {
          await prisma.chartOfAccountEntry.update({
            where: { id: account.id },
            data: { parentAccountId: parentAccount.id }
          });
        }
      }
    }

    // Aplicar mapeos de servicios y productos si hay sector
    // TODO: Implementar cuando se añadan campos de categoría a los modelos ServiceAccountMapping y ProductAccountMapping
    /*
    if (sector && defaultMappings) {
      // Este código se activará cuando se actualicen los modelos
      // para soportar mapeo por categorías
    }
    */

    // Procesar características del negocio si se proporcionaron
    let additionalConfig = {
      categoriesCreated: 0,
      seriesCreated: 0,
      paymentMethodsCreated: 0,
      summary: null as any
    };

    if (businessFeatures && (sector === 'AESTHETIC_CLINIC' || !sector)) {
      try {
        // Obtener información del país para el currency
        const legalEntity = await prisma.legalEntity.findUnique({
          where: { id: legalEntityId },
          select: { countryIsoCode: true }
        });

        const countryCode = legalEntity?.countryIsoCode || 'ES';

        // Generar la configuración extendida
        // const extendedTemplate = generateMaximumTemplate({
        //   name: countryTemplate.names.es || countryTemplate.names.en || countryTemplate.code,
        //   description: countryTemplate.description?.es || countryTemplate.description?.en || '',
        //   country: countryCode,
        //   accounts: allEntries.map(entry => ({
        //     number: entry.accountNumber,
        //     name: entry.names.es || entry.names.en || entry.accountNumber,
        //     type: entry.type,
        //     description: entry.description?.es || entry.description?.en || '',
        //     isActive: true
        //   }))
        // });

        // const summary = generateConfigurationSummary(extendedTemplate);
        // console.log('Extended template generated:', summary);

        // 1. Crear categorías de servicios y familias de productos
        // Nota: Por ahora comentamos esto hasta que se actualicen los modelos de Prisma
        /*
        if (extendedTemplate.extensions.serviceCategories?.length > 0) {
          for (const category of extendedTemplate.extensions.serviceCategories) {
            // TODO: Crear modelo ServiceCategory en Prisma
            additionalConfig.categoriesCreated++;
          }
        }

        if (extendedTemplate.extensions.productFamilies?.length > 0) {
          for (const family of extendedTemplate.extensions.productFamilies) {
            // TODO: Crear modelo ProductFamily en Prisma
            additionalConfig.categoriesCreated++;
          }
        }
        */

        // 2. Crear series de documentos
        // Nota: Verificar si existe modelo DocumentSequence o similar en Prisma
        // Por ahora comentamos esta sección también
        /*
        if (extendedTemplate.extensions.documentSeries?.length > 0) {
          for (const series of extendedTemplate.extensions.documentSeries) {
            // TODO: Verificar modelo correcto para series de documentos
            additionalConfig.seriesCreated++;
          }
        }
        */

        // 3. Crear métodos de pago (solo definiciones, sin mapeos contables por ahora)
        // if (extendedTemplate.extensions.paymentMethods?.length > 0) {
        //   for (const method of extendedTemplate.extensions.paymentMethods) {
        //     const existingMethod = await prisma.paymentMethodDefinition.findFirst({
        //       where: {
        //         code: method.code,
        //         systemId
        //       }
        //     });

        //     if (!existingMethod) {
        //       await prisma.paymentMethodDefinition.create({
        //         data: {
        //           code: method.code,
        //           name: method.name.es, // Por ahora usar solo español
        //           type: method.type as any, // Hacer cast temporal
        //           isActive: true,
        //           systemId
        //         }
        //       });
        //       additionalConfig.paymentMethodsCreated++;
        //     }
        //   }
        // }

        // 4. Aplicar mapeos automáticos si se generaron
        // if (extendedTemplate.extensions.accountingMappings && legalEntityId) {
        //   const mappings = extendedTemplate.extensions.accountingMappings;
          
        //   // Mapeo de métodos de pago
        //   if (mappings.paymentMethods) {
        //     for (const [methodCode, mapping] of Object.entries(mappings.paymentMethods)) {
        //       // Verificar si existe la cuenta contable
        //       const account = accountsByNumber.get(mapping.accountCode);
        //       if (!account) continue;
              
        //       // Verificar si existe el método de pago
        //       const paymentMethod = await prisma.paymentMethodDefinition.findFirst({
        //         where: {
        //           code: methodCode,
        //           systemId
        //         }
        //       });
              
        //       if (paymentMethod) {
        //         // Crear el mapeo
        //         await prisma.paymentMethodAccountMapping.create({
        //           data: {
        //             paymentMethodDefinitionId: paymentMethod.id,
        //             accountId: account.id,
        //             legalEntityId,
        //             systemId
        //           }
        //         });
        //         console.log(`Mapeado método de pago ${methodCode} a cuenta ${mapping.accountCode}`);
        //       }
        //     }
        //   }
          
        //   // Mapeo de tipos de IVA
        //   if (mappings.vatRates) {
        //     for (const [vatCode, vatMapping] of Object.entries(mappings.vatRates)) {
        //       // Verificar si existe la cuenta contable
        //       const account = accountsByNumber.get(vatMapping.accountCode);
        //       if (!account) continue;
              
        //       // Buscar el tipo de IVA correspondiente
        //       const vatType = await prisma.vATType.findFirst({
        //         where: {
        //           systemId,
        //           rate: vatMapping.rate
        //         }
        //       });
              
        //       if (vatType) {
        //         // Crear el mapeo
        //         await prisma.vATTypeAccountMapping.create({
        //           data: {
        //             vatTypeId: vatType.id,
        //             outputAccountId: account.id, // IVA repercutido (ventas)
        //             legalEntityId,
        //             systemId
        //           }
        //         });
        //         console.log(`Mapeado tipo IVA ${vatMapping.rate}% a cuenta ${vatMapping.accountCode}`);
        //       }
        //     }
        //   }
        // }

        // additionalConfig.summary = summary;

      } catch (error) {
        console.error('Error applying extended template configuration:', error);
      }
    }

    return NextResponse.json({
      success: true,
      accountsCreated: createdAccounts.length,
      ...additionalConfig,
      message: `Plantilla importada correctamente. ${createdAccounts.length} cuentas creadas.${
        additionalConfig.categoriesCreated > 0 ? ` ${additionalConfig.categoriesCreated} categorías/familias creadas.` : ''
      }${
        additionalConfig.seriesCreated > 0 ? ` ${additionalConfig.seriesCreated} series de documentos creadas.` : ''
      }${
        additionalConfig.paymentMethodsCreated > 0 ? ` ${additionalConfig.paymentMethodsCreated} métodos de pago creados.` : ''
      }`
    });

  } catch (error) {
    console.error('Error importing chart of accounts template:', error);
    return NextResponse.json(
      { 
        error: "Error al importar la plantilla",
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 