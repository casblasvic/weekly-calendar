import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db' // Asegúrate que la ruta a tu instancia de Prisma sea correcta
import { getServerAuthSession } from '@/lib/auth' // Asegúrate que la ruta a tu helper de sesión sea correcta

export async function GET(request: Request) {
  const session = await getServerAuthSession()

  if (!session || !session.user.systemId) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const { systemId } = session.user

  try {
    const equipments = await prisma.equipment.findMany({
      where: {
        systemId: systemId,
        isActive: true, // Opcional: Considera si solo quieres equipos activos
      },
      orderBy: {
        name: 'asc', // Opcional: Ordenar alfabéticamente
      },
    })

    return NextResponse.json(equipments)
  } catch (error) {
    console.error('[API_EQUIPMENTS_GET]', error)
    return NextResponse.json(
      { message: 'Error al obtener los equipos' },
      { status: 500 },
    )
  }
} 