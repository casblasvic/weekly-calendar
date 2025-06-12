import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/persons/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const person = await prisma.person.findFirst({
      where: {
        id,
        systemId: session.user.systemId,
      },
      include: {
        functionalRoles: {
          include: {
            clientData: true,
            contactData: true,
            leadData: true,
          }
        }
      }
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Transformar los datos para el formato esperado por el frontend
    const clientRole = person.functionalRoles.find(role => role.roleType === 'CLIENT');
    const clientData = clientRole?.clientData;

    const transformedPerson = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      // Usar datos de clientData si existen, sino usar datos de person
      address: clientData?.address || person.address,
      city: clientData?.city || person.city,
      postalCode: clientData?.postalCode || person.postalCode,
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

    return NextResponse.json(transformedPerson);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { error: 'Error fetching person' },
      { status: 500 }
    );
  }
}
