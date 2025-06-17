import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/persons/[id]
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
            contactData: {
              include: {
                company: true
              }
            },
            leadData: {
              include: {
                opportunities: {
                  include: {
                    clinic: true
                  }
                },
                assignedToUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
          }
        }
      }
    });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Transformar los datos para incluir toda la información de roles
    const transformedPerson = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phone,
      address: person.address,
      city: person.city,
      stateProvince: person.stateProvince,
      postalCode: person.postalCode,
      countryIsoCode: person.countryIsoCode,
      birthDate: person.birthDate,
      gender: person.gender,
      nationalId: person.nationalId,
      notes: person.notes,
      functionalRoles: person.functionalRoles,
      // Información resumida de roles activos
      activeRoles: person.functionalRoles
        ?.filter(role => role.isActive)
        .map(role => role.roleType) || [],
      // Información específica por rol
      clientData: person.functionalRoles
        ?.filter(role => role.roleType === 'CLIENT' && role.isActive)
        .map(role => role.clientData)[0] || null,
      contactRoles: person.functionalRoles
        ?.filter(role => role.roleType === 'CONTACT' && role.isActive)
        .map(role => ({
          ...role.contactData,
          company: role.contactData?.company,
          roleId: role.id
        })) || [],
      leadRoles: person.functionalRoles
        ?.filter(role => role.roleType === 'LEAD' && role.isActive)
        .map(role => ({
          ...role.leadData,
          opportunities: role.leadData?.opportunities || [],
          assignedToUser: role.leadData?.assignedToUser,
          roleId: role.id
        })) || []
    };

    return NextResponse.json(transformedPerson);
  } catch (error) {
    console.error('Error fetching person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/persons/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Solo permitir campos específicos para evitar sobrescritura maliciosa
    const allowedFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'address',
      'city',
      'postalCode',
      'birthDate',
      'stateProvince',
      'countryIsoCode',
      'nationalId',
      'notes'
    ] as const;

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data && data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    // Convert birthDate string to Date if provided
    if (updateData.birthDate) {
      updateData.birthDate = new Date(updateData.birthDate);
    }

    const updatedPerson = await prisma.person.update({
      where: {
        id,
        systemId: session.user.systemId
      },
      data: updateData
    });

    return NextResponse.json(updatedPerson);
  } catch (error) {
    console.error('Error updating person:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
