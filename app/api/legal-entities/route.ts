import { NextResponse } from 'next/server';
import * as z from 'zod';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { apiCreateLegalEntityPayloadSchema } from '@/lib/schemas/legal-entity-schemas';

export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user || !session.user.systemId) {
      return NextResponse.json({ message: 'Unauthorized: User or System ID not found in session' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    if (!systemId) { // Esta comprobación adicional es redundante si la anterior ya valida session.user.systemId, pero la mantenemos por si acaso.
      return NextResponse.json({ message: 'Unauthorized: System ID not found' }, { status: 401 });
    }

    const legalEntities = await prisma.legalEntity.findMany({
      where: { systemId: systemId },
      include: {
        country: { select: { isoCode: true, name: true } },
        clinics: { 
          select: { 
            id: true, 
            name: true 
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(legalEntities);
  } catch (error) {
    console.error('Error fetching legal entities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Unauthorized')) {
        return NextResponse.json({ message: errorMessage }, { status: 401 });
    }
    return NextResponse.json({ message: 'Error fetching legal entities', error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado para esta acción' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    let body;
    try {
      body = await request.json();
      console.log('[API POST /api/legal-entities] Request body parsed:', JSON.stringify(body, null, 2));
    } catch (error) {
      console.error('[API POST /api/legal-entities] Error parsing JSON body:', error);
      return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }

    const validationResult = apiCreateLegalEntityPayloadSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[API POST /api/legal-entities] Zod Validation Failed:', JSON.stringify(validationResult.error.format(), null, 2));
      return NextResponse.json({ message: 'Invalid request data', errors: validationResult.error.format() }, { status: 400 });
    }
    console.log('[API POST /api/legal-entities] Zod Validation OK. Validated data:', JSON.stringify(validationResult.data, null, 2));

    const validatedData = validationResult.data;
    // Ahora validatedData contendrá 'taxIdentifierFields' (objeto) en lugar de 'taxIdentifiers' (array)
    const { clinicIds, taxIdentifierFields, ...restOfValidatedData } = validatedData;

    // validatedData.taxIdentifierFields ya es el objeto que necesitamos para la BD (o undefined si no se proporcionó o estaba vacío)
    // La transformación manual ya no es necesaria aquí, ya que el frontend la hizo y el esquema de la API la validó.
    const taxIdentifierFieldsForDb = validatedData.taxIdentifierFields;
    console.log('[API POST /api/legal-entities] taxIdentifierFields from validated payload:', JSON.stringify(taxIdentifierFieldsForDb, null, 2));

    // Verificar que CountryInfo exista para el countryIsoCode (jurisdicción fiscal)
    const jurisdictionCountry = await prisma.countryInfo.findUnique({
      where: { isoCode: restOfValidatedData.countryIsoCode },
    });
    if (!jurisdictionCountry) {
      return NextResponse.json({ message: `País de jurisdicción fiscal con código ISO '${restOfValidatedData.countryIsoCode}' no encontrado.` }, { status: 400 });
    }

    // Verificar que CountryInfo exista para el phoneCountryIsoCode, si se proporciona
    if (restOfValidatedData.phoneCountryIsoCode) {
      const phoneCountryCheck = await prisma.countryInfo.findUnique({
        where: { isoCode: restOfValidatedData.phoneCountryIsoCode },
      });
      if (!phoneCountryCheck) {
        return NextResponse.json({ message: `País para el prefijo telefónico con código ISO '${restOfValidatedData.phoneCountryIsoCode}' no encontrado.` }, { status: 400 });
      }
    }

    // Construir explícitamente el objeto de datos para la creación
    const dataToCreate: Prisma.LegalEntityCreateInput = {
      name: restOfValidatedData.name,
      system: { // Conectar explícitamente la relación 'system'
        connect: { id: systemId }
      },
      country: { // Conectar explícitamente la relación 'country'
        connect: { isoCode: restOfValidatedData.countryIsoCode }
      },
      // Campos opcionales que pueden o no estar en restOfValidatedData
      ...(restOfValidatedData.fullAddress && { fullAddress: restOfValidatedData.fullAddress }),
      ...(taxIdentifierFieldsForDb && { taxIdentifierFields: taxIdentifierFieldsForDb }), 
      ...(restOfValidatedData.email && { email: restOfValidatedData.email }),
      ...(restOfValidatedData.phone && { phone: restOfValidatedData.phone }),
    };

    // Conectar phoneCountry si phoneCountryIsoCode está presente
    if (restOfValidatedData.phoneCountryIsoCode) {
      dataToCreate.phoneCountry = { 
        connect: { isoCode: restOfValidatedData.phoneCountryIsoCode }
      };
    }

    // Conectar clínicas si se proporcionaron IDs
    if (clinicIds && clinicIds.length > 0) {
      dataToCreate.clinics = {
        connect: clinicIds.map((id: string) => ({ id: id })),
      };
    }

        console.log('[API POST /api/legal-entities] Data to create (just before Prisma call):', JSON.stringify(dataToCreate, null, 2));
    // Crear la LegalEntity en la base de datos
    const newLegalEntity = await prisma.legalEntity.create({
      data: dataToCreate,
      include: {
        country: true,       // Incluye el objeto CountryInfo completo para la jurisdicción fiscal
        phoneCountry: true,  // Incluye el objeto CountryInfo completo para el prefijo telefónico
        system: true,        // Incluir la relación system
        clinics: true,       // Incluye la lista de clínicas asociadas
      },
    });

    return NextResponse.json(newLegalEntity, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Si es un error de validación de Zod, devolver los errores específicos
      return NextResponse.json({ message: 'Datos de entrada inválidos', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    // Para otros errores, loguear y devolver un error genérico
    console.error("Error al crear la sociedad mercantil:", error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al crear la sociedad mercantil.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
