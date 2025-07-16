/**
 * 📊 API: CLIENT ANOMALY SCORES - DATOS REALES
 * ============================================
 * 
 * Obtiene scores de anomalías de clientes desde la tabla real:
 * smart_plug_client_anomaly_scores
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro opcional por clínica específica
 * - clientId: ID del cliente de la tabla persons
 * 
 * Campos retornados:
 * - totalServices, totalAnomalies, anomalyRate
 * - avgDeviationPercent, maxDeviationPercent
 * - suspiciousPatterns, favoredByEmployees (JSON)
 * - riskScore, riskLevel
 * - client: Información del cliente (firstName, lastName, email, phone)
 * 
 * 🚨 IMPORTANTE: Solo usar datos reales de BD, NUNCA mock data
 * 
 * @see docs/AUTHENTICATION_PATTERNS.md
 * @see docs/ENERGY_INSIGHTS.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // 🔐 Verificar autenticación
    const session = await auth()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 📝 Extraer parámetros de consulta
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get('clinicId')

    // 🔍 Consultar datos REALES desde la tabla smart_plug_client_anomaly_scores
    const clientScores = await prisma.clientAnomalyScore.findMany({
      where: {
        systemId: session.user.systemId
        // ✅ ELIMINADO: clinicId filter - ahora hay UN registro por cliente en todo el sistema
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
        // ✅ ELIMINADO: clinic relation - ya no es necesaria
      },
      orderBy: [
        { riskScore: 'desc' },
        { anomalyRate: 'desc' }
      ]
    })

    // 🚨 FILTRAR registros con relaciones válidas
    const validClientScores = clientScores.filter(score => 
      score.client !== null
      // ✅ ELIMINADO: clinic !== null - ya no es necesario
    )

    // 🔍 RESOLVER NOMBRES DE EMPLEADOS FAVORECIDOS
    // Obtener todos los IDs de empleados únicos de todos los clientes
    const allEmployeeIds = new Set<string>()
    validClientScores.forEach(score => {
      const favoredByEmployees = score.favoredByEmployees as Record<string, number>
      Object.keys(favoredByEmployees).forEach(employeeId => {
        allEmployeeIds.add(employeeId)
      })
    })

    // Consultar nombres de empleados en una sola query
    const employeesData = await prisma.user.findMany({
      where: {
        id: { in: Array.from(allEmployeeIds) },
        systemId: session.user.systemId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    })

    // Crear mapa de ID -> nombre para resolución rápida
    const employeeNamesMap = new Map<string, string>()
    employeesData.forEach(employee => {
      const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
      employeeNamesMap.set(employee.id, fullName || `Empleado ${employee.id.slice(-8)}`)
    })

    // 📊 Calcular estadísticas agregadas
    const stats = {
      totalClients: validClientScores.length,
      totalWithAnomalies: validClientScores.filter(client => client.totalAnomalies > 0).length,
      avgDeviationPercent: validClientScores.length > 0 
        ? validClientScores.reduce((acc, client) => acc + Number(client.avgDeviationPercent), 0) / validClientScores.length
        : 0,
      riskDistribution: {
        critical: validClientScores.filter(client => client.riskLevel === 'critical').length,
        high: validClientScores.filter(client => client.riskLevel === 'high').length,
        medium: validClientScores.filter(client => client.riskLevel === 'medium').length,
        low: validClientScores.filter(client => client.riskLevel === 'low').length
      }
    }

    // ✅ Retornar datos reales con nombres resueltos
    return NextResponse.json({
      success: true,
      clientScores: validClientScores.map(score => {
        // 🎯 TRANSFORMAR favoredByEmployees: ID -> nombres
        const favoredByEmployeesWithNames: Record<string, number> = {}
        const originalFavoredByEmployees = score.favoredByEmployees as Record<string, number>
        
        Object.entries(originalFavoredByEmployees).forEach(([employeeId, count]) => {
          const employeeName = employeeNamesMap.get(employeeId) || `Empleado ${employeeId.slice(-8)}`
          favoredByEmployeesWithNames[employeeName] = count
        })

        return {
          id: score.id,
          clientId: score.clientId,
          client: score.client,
          // ✅ ELIMINADO: clinic - ya no está en el modelo
          totalServices: score.totalServices,
          totalAnomalies: score.totalAnomalies,
          anomalyRate: Number(score.anomalyRate),
          avgDeviationPercent: Number(score.avgDeviationPercent),
          maxDeviationPercent: Number(score.maxDeviationPercent),
          suspiciousPatterns: score.suspiciousPatterns,
          favoredByEmployees: favoredByEmployeesWithNames, // ✅ NOMBRES EN LUGAR DE IDs
          riskScore: score.riskScore,
          riskLevel: score.riskLevel,
          lastAnomalyDate: score.lastAnomalyDate,
          lastCalculated: score.lastCalculated,
          createdAt: score.createdAt,
          updatedAt: score.updatedAt
        }
      }),
      stats
    })

  } catch (error) {
    console.error('Error fetching client scores:', error)
    return NextResponse.json({ 
      error: "Error interno del servidor al obtener scores de clientes",
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error))
        : undefined
    }, { status: 500 })
  }
} 