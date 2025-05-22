import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerAuthSession } from '@/lib/auth'
import { z } from 'zod'

const ParamsSchema = z.object({
  clinicId: z.string().cuid({ message: 'El ID de la clínica debe ser un CUID válido.' })
})

export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ clinicId: string }> }) {
  try {
    const params = await paramsPromise
    const { clinicId: clinicIdFromParams } = params

    const session = await getServerAuthSession()
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json(
        { error: 'Usuario no autenticado o falta systemId.' },
        { status: 401 }
      )
    }
    const systemId = session.user.systemId

    console.log("[API_USERS_BY_CLINIC_GET] Received clinicIdFromParams:", clinicIdFromParams);

    // Validar el clinicId extraído
    const paramsValidation = ParamsSchema.safeParse({ clinicId: clinicIdFromParams })
    if (!paramsValidation.success) {
      console.error("[API_USERS_BY_CLINIC_GET] Zod validation failed:", paramsValidation.error.flatten());
      return NextResponse.json(
        { error: 'Parámetro clinicId inválido', details: paramsValidation.error.flatten() },
        { status: 400 }
      )
    }

    const validatedClinicId = paramsValidation.data.clinicId;
    console.log("[API_USERS_BY_CLINIC_GET] Validated clinicId:", validatedClinicId);

    const clinic = await prisma.clinic.findFirst({
      where: {
        id: validatedClinicId,
        systemId: systemId,
      },
      select: { id: true } // Solo necesitamos verificar que existe
    })

    if (!clinic) {
      return NextResponse.json(
        { error: 'Clínica no encontrada o no pertenece al sistema del usuario.' },
        { status: 404 }
      )
    }

    const users = await prisma.user.findMany({
      where: {
        systemId: systemId,
        isActive: true,
        clinicAssignments: {
           some: {
            clinicId: validatedClinicId,
            // Aquí podríamos añadir un filtro para que el assignment esté activo si UserClinicAssignment tiene un campo isActive
            // O filtrar por roles específicos si el campo 'role' está bien definido en UserClinicAssignment
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    console.log("[API_USERS_BY_CLINIC_GET] Found users:", users.length);
    return NextResponse.json(users)

  } catch (error) {
    console.error('[API_USERS_BY_CLINIC_GET] Error fetching users by clinic:', error)
    let errorMessage = 'Error al obtener los usuarios de la clínica.'
    if (error instanceof z.ZodError) {
      errorMessage = 'Error de validación.'
    } else if (error instanceof Error) {
      // Puedes personalizar más mensajes si es necesario
    }
    return NextResponse.json({ error: errorMessage, details: error instanceof Error ? error.message : null }, { status: 500 })
  }
} 