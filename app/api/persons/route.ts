import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/persons
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const roleType = searchParams.get('roleType');

    const where: any = {
      systemId: session.user.systemId,
    };

    // Filtrar por tipo de rol si se especifica
    if (roleType) {
      where.functionalRoles = {
        some: {
          roleType: roleType
        }
      };
    }

    // Búsqueda por texto
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { nationalId: { contains: search } },
      ];
    }

    const persons = await prisma.person.findMany({
      where,
      include: {
        functionalRoles: {
          include: {
            clientData: true,
            contactData: true,
            leadData: true,
          }
        }
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      take: 100, // Limitar resultados
    });

    // Transformar los datos para el formato esperado por el frontend
    const transformedPersons = persons.map(person => {
      const clientRole = person.functionalRoles.find(role => role.roleType === 'CLIENT');
      const clientData = clientRole?.clientData;

      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phone,
        // Usar datos de clientData si existen, sino usar datos de person
        address: person.address || clientData?.address || null,
        city: person.city || clientData?.city || null,
        postalCode: person.postalCode || clientData?.postalCode || null,
        // Campos adicionales para compatibilidad
        taxId: person.taxId || null,
        fiscalName: null, // Person no tiene fiscalName
        phoneCountryIsoCode: null, // Person no tiene phoneCountryIsoCode
        country: person.countryIsoCode ? { 
          name: null,
          isoCode: person.countryIsoCode
        } : null,
        company: null, // TODO: Implementar relación con Company si es necesario
        clientData: clientData ? {
          address: clientData.address,
          city: clientData.city,
          postalCode: clientData.postalCode,
          countryIsoCode: clientData.countryIsoCode,
          marketingConsent: clientData.marketingConsent,
          isActive: clientData.isActive,
        } : null,
      };
    });

    return NextResponse.json(transformedPersons);
  } catch (error) {
    console.error('Error fetching persons:', error);
    return NextResponse.json(
      { error: 'Error fetching persons' },
      { status: 500 }
    );
  }
}
