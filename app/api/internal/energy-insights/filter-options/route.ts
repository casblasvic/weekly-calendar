/**
 * 🔬 ENERGY INSIGHTS - OPTIMIZED FILTER OPTIONS API
 * ==================================================
 * 
 * API optimizada para obtener opciones de filtros avanzados:
 * - Consultas simplificadas y eficientes
 * - Solo datos necesarios para los filtros
 * - Evita timeouts del pool de conexiones
 * 
 * 🔐 AUTENTICACIÓN: auth() de @/lib/auth
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation obligatorio
 * 
 * @see docs/ENERGY_INSIGHTS.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/lib/auth"
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const systemId = session.user.systemId
    const searchParams = request.nextUrl.searchParams
    const clinicId = searchParams.get('clinicId')

    // 🏥 FILTRO BASE
    const baseFilter = {
      systemId,
      ...(clinicId && clinicId !== 'all' && { clinicId })
    }

    // 📊 CONSULTAS OPTIMIZADAS EN PARALELO
    const [employees, clients, services] = await Promise.all([
      // 👨‍💼 EMPLEADOS que han realizado servicios con anomalías
      prisma.user.findMany({
        where: {
          systemId,
          appointmentsAsProf: {
            some: {
              systemId,
              ...(clinicId && clinicId !== 'all' && { clinicId }),
              deviceUsageInsights: {
                some: baseFilter
              }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          _count: {
            select: {
              appointmentsAsProf: {
                where: {
                  systemId,
                  ...(clinicId && clinicId !== 'all' && { clinicId }),
                  deviceUsageInsights: {
                    some: baseFilter
                  }
                }
              }
            }
          }
        },
        take: 50 // Limitar para evitar sobrecarga
      }),

      // 👥 CLIENTES que tienen anomalías
      prisma.person.findMany({
        where: {
          systemId,
          functionalRoles: {
            some: {
              roleType: 'CLIENT'
            }
          },
          appointments: {
            some: {
              systemId,
              ...(clinicId && clinicId !== 'all' && { clinicId }),
              deviceUsageInsights: {
                some: baseFilter
              }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          _count: {
            select: {
              appointments: {
                where: {
                  systemId,
                  ...(clinicId && clinicId !== 'all' && { clinicId }),
                  deviceUsageInsights: {
                    some: baseFilter
                  }
                }
              }
            }
          }
        },
        take: 50 // Limitar para evitar sobrecarga
      }),

      // 🛠️ SERVICIOS que han generado anomalías - CONSULTA SIMPLIFICADA Y CORREGIDA
      (async () => {
        // Primero obtener todos los appointmentIds que tienen insights
        const insightAppointmentIds = await prisma.deviceUsageInsight.findMany({
          where: baseFilter,
          select: { appointmentId: true },
          distinct: ['appointmentId']
        })
        
        const appointmentIds = insightAppointmentIds.map(i => i.appointmentId)
        
        if (appointmentIds.length === 0) {
          return []
        }
        
        // Luego obtener todos los servicios de esas citas
        return await prisma.service.findMany({
          where: {
            systemId,
            appointmentServices: {
              some: {
                appointmentId: {
                  in: appointmentIds
                }
              }
            }
          },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                appointmentServices: {
                  where: {
                    appointmentId: {
                      in: appointmentIds
                    }
                  }
                }
              }
            }
          },
          take: 50 // Limitar para evitar sobrecarga
        })
      })()
    ])

    // 🎨 FORMATEAR RESPUESTA
    const response = {
      employees: employees.map(emp => ({
        id: emp.id,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        anomalyCount: emp._count.appointmentsAsProf
      })).filter(emp => emp.name && emp.anomalyCount > 0),

      clients: clients.map(client => ({
        id: client.id,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        anomalyCount: client._count.appointments
      })).filter(client => client.name && client.anomalyCount > 0),

      services: services.map(service => ({
        id: service.id,
        name: service.name,
        anomalyCount: service._count.appointmentServices
      })).filter(service => service.anomalyCount > 0)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error en filter-options API:', error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
} 