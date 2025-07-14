/**
 * 📊 API: EMPLOYEE ANOMALY SCORES - DATOS REALES
 * ==============================================
 * 
 * Obtiene scores de anomalías de empleados desde la tabla real:
 * smart_plug_employee_anomaly_scores
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Identificador del sistema (multi-tenant)
 * - clinicId: Filtro opcional por clínica específica
 * - employeeId: ID del empleado de la tabla users
 * 
 * Campos retornados:
 * - totalServices, totalAnomalies, anomalyRate
 * - avgEfficiency, consistencyScore
 * - favoredClients, fraudIndicators, timePatterns (JSON)
 * - riskScore, riskLevel
 * - employee: Información del empleado (firstName, lastName, email)
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

    // 🔍 Consultar datos REALES desde la tabla smart_plug_employee_anomaly_scores
    const employeeScores = await prisma.employeeAnomalyScore.findMany({
      where: {
        systemId: session.user.systemId
        // ✅ ELIMINADO: clinicId filter - ahora hay UN registro por empleado en todo el sistema
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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
    const validEmployeeScores = employeeScores.filter(score => 
      score.employee !== null
      // ✅ ELIMINADO: clinic !== null - ya no es necesario
    )

    // 📊 Calcular estadísticas agregadas
    const stats = {
      totalEmployees: validEmployeeScores.length,
      totalWithAnomalies: validEmployeeScores.filter(emp => emp.totalAnomalies > 0).length,
      avgEfficiency: validEmployeeScores.length > 0 
        ? validEmployeeScores.reduce((acc, emp) => acc + Number(emp.avgEfficiency), 0) / validEmployeeScores.length
        : 100,
      riskDistribution: {
        critical: validEmployeeScores.filter(emp => emp.riskLevel === 'critical').length,
        high: validEmployeeScores.filter(emp => emp.riskLevel === 'high').length,
        medium: validEmployeeScores.filter(emp => emp.riskLevel === 'medium').length,
        low: validEmployeeScores.filter(emp => emp.riskLevel === 'low').length
      }
    }

    return NextResponse.json({
      success: true,
      employeeScores: validEmployeeScores.map(score => ({
        id: score.id,
        employeeId: score.employeeId,
        employee: score.employee,
        // ✅ ELIMINADO: clinic - ya no está en el modelo
        totalServices: score.totalServices,
        totalAnomalies: score.totalAnomalies,
        anomalyRate: Number(score.anomalyRate),
        avgEfficiency: Number(score.avgEfficiency),
        consistencyScore: Number(score.consistencyScore),
        favoredClients: score.favoredClients,
        fraudIndicators: score.fraudIndicators,
        timePatterns: score.timePatterns,
        riskScore: score.riskScore,
        riskLevel: score.riskLevel,
        lastCalculated: score.lastCalculated,
        createdAt: score.createdAt,
        updatedAt: score.updatedAt
      })),
      stats
    })

  } catch (error) {
    console.error('Error fetching employee scores:', error)
    return NextResponse.json({ 
      error: "Error interno del servidor al obtener scores de empleados",
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error))
        : undefined
    }, { status: 500 })
  }
} 