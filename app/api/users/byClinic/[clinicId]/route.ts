import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
// import { auth } from '@/lib/auth' // Comentado temporalmente hasta implementar auth (Paso 2.2)

export async function GET(request: Request, props: { params: Promise<{ clinicId: string }> }) {
  const params = await props.params;
  try {
    // const session = await auth() // Descomentar cuando la autenticación esté lista
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const clinicId = params.clinicId

    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 })
    }

    // Asegurarse de que clinicId sea un número si el ID en la base de datos es numérico
    // const numericClinicId = parseInt(clinicId, 10);
    // if (isNaN(numericClinicId)) {
    //   return NextResponse.json({ error: 'Invalid Clinic ID format' }, { status: 400 });
    // }
    // Si el ID es string (UUID o similar), usar clinicId directamente

    const users = await prisma.user.findMany({
      where: {
        // La condición depende de cómo esté modelada la relación Usuario-Clínica
        // Opción 1: Relación Many-to-Many a través de una tabla intermedia (ej: UserClinic)
        // clinicas: {
        //   some: {
        //     clinicId: clinicId, // o numericClinicId
        //   },
        // },
        // Opción 2: Si User tiene un campo directo clinicId (menos común para multi-clínica)
        // clinicId: clinicId, // o numericClinicId
        // Opción 3: Usar la relación inversa de la tabla de asignación explícita
        clinicAssignments: { // <- Asegurarse que este es el nombre correcto
           some: {
             clinicId: clinicId, 
           },
         },
      },
      include: {
        // Incluir roles para obtener la información del perfil
        roles: {
          include: {
            role: true // Asumiendo un modelo Role en UserRole
          }
        }
        // Incluir otros datos relevantes si es necesario
      },
      orderBy: {
        lastName: 'asc' // Ordenar por apellido por defecto
      }
    })

    // Podrías querer transformar los datos antes de enviarlos
    // Por ejemplo, simplificar la estructura de roles
    const formattedUsers = users.map(user => ({
      ...user,
      // roles: user.roles.map(ur => ur.role.name) // Ejemplo de formato
    }));

    // return NextResponse.json(users) // O devolver usuarios formateados
    return NextResponse.json(formattedUsers)

  } catch (error) {
    console.error("[API_USERS_BY_CLINIC_GET]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 