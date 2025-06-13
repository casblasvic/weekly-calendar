import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/contacts - Obtener todos los contactos con sus roles
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todas las personas con sus roles funcionales y datos específicos
    let persons = await prisma.person.findMany({
      where: {
        systemId: session.user.systemId,
      },
      include: {
        functionalRoles: {
          include: {
            clientData: {
              include: {
                originClinic: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            leadData: {
              include: {
                assignedToUser: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                company: {
                  select: {
                    id: true,
                    fiscalName: true,
                  },
                },
              },
            },
            contactData: {
              include: {
                company: {
                  select: {
                    id: true,
                    fiscalName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Obtener parámetros de búsqueda de la URL
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const roleFilter = searchParams.get('role');

    // Filtrar por rol específico si se proporciona
    if (roleFilter && roleFilter !== 'all') {
      persons = persons.filter((person) => {
        return person.functionalRoles.some((role) => role.roleType === roleFilter.toUpperCase());
      });
    }

    // Búsqueda por texto
    if (search) {
      persons = persons.filter((person) => {
        const searchLower = search.toLowerCase();
        return (
          person.firstName.toLowerCase().includes(searchLower) ||
          person.lastName.toLowerCase().includes(searchLower) ||
          (person.email && person.email.toLowerCase().includes(searchLower)) ||
          (person.phone && person.phone.includes(search))
        );
      });
    }

    // Transformar los datos para el frontend
    const contacts = persons.map((person) => {
      // Determinar roles activos
      const roles: string[] = [];
      let leadData = null;
      let contactData = null;
      let clientData = null;
      let company = null;
      let lastVisit = null;

      person.functionalRoles.forEach((role) => {
        if (role.roleType === 'CLIENT' && role.clientData) {
          roles.push('Cliente');
          clientData = {
            isActive: role.clientData.isActive,
            marketingConsent: role.clientData.marketingConsent,
            originClinic: role.clientData.originClinic?.name || null,
          };
        }

        if (role.roleType === 'LEAD' && role.leadData) {
          roles.push('Lead');
          leadData = {
            status: role.leadData.status,
            source: role.leadData.source,
            assignedTo: role.leadData.assignedToUser
              ? `${role.leadData.assignedToUser.firstName} ${role.leadData.assignedToUser.lastName}`
              : null,
            priority: role.leadData.priority,
            estimatedValue: role.leadData.estimatedValue,
          };
          // Si el lead tiene empresa asociada
          if (role.leadData.company) {
            company = role.leadData.company.fiscalName;
          } else if (role.leadData.companyName) {
            company = role.leadData.companyName;
          }
        }

        if (role.roleType === 'CONTACT' && role.contactData) {
          roles.push('Contacto');
          contactData = {
            position: role.contactData.position,
            department: role.contactData.department,
            isPrimary: role.contactData.isPrimary,
          };
          if (role.contactData.company) {
            company = role.contactData.company.fiscalName;
          }
        }

        if (role.roleType === 'EMPLOYEE') {
          roles.push('Empleado');
        }
      });

      // Determinar tipo principal
      let type = 'person';
      if (roles.includes('Cliente')) type = 'client';
      else if (roles.includes('Lead')) type = 'lead';
      else if (roles.includes('Contacto')) type = 'contact';
      else if (roles.includes('Empleado')) type = 'employee';

      return {
        id: person.id,
        name: `${person.firstName} ${person.lastName}`,
        email: person.email || '',
        phone: person.phone || '',
        lastVisit, // Por ahora null, se puede conectar con appointments/tickets más adelante
        type,
        roles,
        company,
        leadData,
        contactData,
        clientData,
      };
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Error al obtener los contactos' },
      { status: 500 }
    );
  }
}
