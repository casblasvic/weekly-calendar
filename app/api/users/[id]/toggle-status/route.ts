import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
// import { auth } from '@/lib/auth' // Comentado temporalmente
import { Prisma } from '@prisma/client'

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // const session = await auth()
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    // // Añadir comprobación de permisos si es necesario
    // // if (!hasPermission(session.user.roles, 'update', 'user')) { 
    // //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // // }

    const userId = params.id

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // 1. Obtener el usuario actual para saber su estado isActive
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true } // Solo necesitamos saber el estado actual
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Actualizar el estado isActive al valor contrario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive // Invertir el estado actual
      },
      select: { // Devolver solo los campos necesarios
        id: true,
        isActive: true
      }
    })

    return NextResponse.json(updatedUser)

  } catch (error) {
    console.error("[API_USER_TOGGLE_STATUS_PATCH]", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 