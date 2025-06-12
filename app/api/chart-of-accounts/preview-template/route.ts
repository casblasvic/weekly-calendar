/**
 * API para obtener vista previa de plantillas contables
 * Combina plantilla base de país con personalizaciones de sector
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  COUNTRY_TEMPLATES, 
  type SupportedCountry
} from '@/config/accounting';
import { BusinessSector, type ChartOfAccountTemplateEntry } from '@/types/accounting';
import { getServerAuthSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateCode, country, sector } = body;

    if (!country || !templateCode) {
      return NextResponse.json(
        { error: 'País y código de plantilla son requeridos' },
        { status: 400 }
      );
    }

    // Obtener plantilla base del país
    const countryTemplate = COUNTRY_TEMPLATES[country as SupportedCountry];
    if (!countryTemplate) {
      return NextResponse.json(
        { error: 'Plantilla de país no encontrada' },
        { status: 404 }
      );
    }

    // Copiar las cuentas base
    let accounts = [...countryTemplate.accounts];
    
    // Por ahora no aplicamos personalizaciones de sector
    // TODO: Implementar cuando se defina SECTOR_TEMPLATES

    // Ordenar cuentas por número
    accounts.sort((a, b) => {
      const numA = a.accountNumber.padEnd(10, '0');
      const numB = b.accountNumber.padEnd(10, '0');
      return numA.localeCompare(numB);
    });

    // Devolver estructura completa
    return NextResponse.json({
      templateCode,
      country,
      sector,
      name: countryTemplate.name,
      description: countryTemplate.description,
      accountsCount: accounts.length,
      accounts
    });

  } catch (error) {
    console.error('Error en preview de plantilla:', error);
    return NextResponse.json(
      { error: 'Error al generar preview' },
      { status: 500 }
    );
  }
} 