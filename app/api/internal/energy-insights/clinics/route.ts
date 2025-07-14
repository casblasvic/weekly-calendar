import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * 📊 ENERGY INSIGHTS CLINICS
 * 
 * Endpoint para obtener todas las clínicas del sistema para el filtro.
 * Incluye información sobre el estado activo/inactivo de cada clínica.
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - isActive: Estado de la clínica
 * 
 * @see docs/AUTHENTICATION_PATTERNS.md
 */
export async function GET(req: NextRequest) {
  if (!process.env.FEATURE_SHELLY) {
    return NextResponse.json({ error: 'Shelly feature disabled' }, { status: 404 })
  }
  
  const session = await auth()
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  
  const systemId = session.user.systemId

  try {
    // Obtener todas las clínicas del sistema
    const clinics = await prisma.clinic.findMany({
      where: {
        systemId
      },
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
        city: true,
        phone: true
      },
      orderBy: [
        { isActive: 'desc' }, // Activas primero
        { name: 'asc' }       // Luego alfabéticamente
      ]
    })

    return NextResponse.json({
      success: true,
      data: {
        clinics,
        total: clinics.length,
        active: clinics.filter(c => c.isActive).length,
        inactive: clinics.filter(c => !c.isActive).length
      }
    })

  } catch (error) {
    console.error('Error obteniendo clínicas:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 