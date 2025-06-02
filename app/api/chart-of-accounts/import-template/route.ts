import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { 
  IFRS_AESTHETIC_CLINIC_TEMPLATE,
  COUNTRY_TEMPLATES,
  COUNTRY_VAT_CONFIGS,
  SECTOR_TEMPLATES,
  type SupportedCountry
} from "@/config/accounting";
import { BusinessSector, type ChartOfAccountTemplateEntry } from '@/types/accounting';

interface ImportTemplateRequest {
  templateCode: string;
  country: SupportedCountry;
  sector?: BusinessSector;
  systemId: string;
  legalEntityId?: string;
  mode: 'replace' | 'merge';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body: ImportTemplateRequest = await request.json();
    const { templateCode, country, sector, systemId, legalEntityId, mode } = body;

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
        // Recopilar mapeos predeterminados
        if (sectorTemplate.accountCustomizations.defaultMappings) {
          defaultMappings = sectorTemplate.accountCustomizations.defaultMappings;
        }
      }
    }

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

    // Combinar entradas base con adicionales del sector
    const allEntries = [...template.entries, ...additionalAccounts];

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
      let accountData = {
        accountNumber: entry.accountNumber,
        name: entry.names.es || entry.names.en || Object.values(entry.names)[0],
        type: entry.type,
        description: entry.description?.es,
        isMonetary: entry.isMonetary ?? false,
        isActive: true,
        allowsDirectEntry: entry.allowsDirectEntry ?? true,
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

    return NextResponse.json({
      success: true,
      created: createdAccounts.length,
      message: `Plan contable importado correctamente. ${createdAccounts.length} cuentas creadas.`,
      sector: sector || 'general'
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