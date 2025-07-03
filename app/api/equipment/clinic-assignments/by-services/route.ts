import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * 🎯 API: Obtener enchufes inteligentes filtrados por servicios de una cita
 * 
 * LÓGICA EXPLICADA:
 * 1. Recibir clinicId y serviceIds de la cita
 * 2. Obtener enchufes de la clínica (SmartPlugDevice)
 * 3. Para cada enchufe:
 *    - SmartPlugDevice.equipmentClinicAssignmentId → EquipmentClinicAssignment.equipmentId
 *    - EquipmentClinicAssignment.equipmentId → ServiceEquipmentRequirement.equipmentId
 *    - Si ServiceEquipmentRequirement.serviceId coincide con servicios de la cita → INCLUIR
 * 4. Retornar enchufes filtrados con misma estética que menú flotante
 */
export async function POST(request: NextRequest) {
  try {
    const { clinicId, serviceIds } = await request.json()

    if (!clinicId || !serviceIds || !Array.isArray(serviceIds)) {
      return NextResponse.json(
        { error: 'clinicId y serviceIds son requeridos' },
        { status: 400 }
      )
    }

    // 1️⃣ OBTENER todos los enchufes de la clínica con sus asignaciones
    const smartPlugs = await prisma.smartPlugDevice.findMany({
      where: {
        equipmentClinicAssignment: {
          clinicId: clinicId
        }
      },
      include: {
        equipmentClinicAssignment: {
          include: {
            equipment: {
              include: {
                // 2️⃣ INCLUIR requirements de servicios para filtrar - RELACIÓN CORRECTA
                requiredByServices: {
                  where: {
                    serviceId: {
                      in: serviceIds // ✅ FILTRO: Solo servicios de la cita
                    }
                  }
                }
              }
            },
            clinic: {
              select: {
                id: true,
                name: true
              }
            },
            cabin: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // 3️⃣ FILTRAR solo enchufes que pueden realizar los servicios de la cita
    const filteredPlugs = smartPlugs.filter((plug) => {
      // Verificar si el equipo asignado puede realizar algún servicio de la cita
      return plug.equipmentClinicAssignment?.equipment?.requiredByServices?.length > 0
    })

    // 4️⃣ RESPUESTA con mismo formato que menú flotante
    const response = filteredPlugs.map((plug) => ({
      id: plug.id,
      name: plug.name,
      deviceId: plug.deviceId,
      online: plug.online,
      relayOn: plug.relayOn,
      currentPower: plug.currentPower,
      voltage: plug.voltage,
      temperature: plug.temperature,
      appointmentOnlyMode: plug.appointmentOnlyMode,
      autoShutdownEnabled: plug.autoShutdownEnabled,
      equipmentClinicAssignment: {
        id: plug.equipmentClinicAssignment.id,
        deviceName: plug.equipmentClinicAssignment.deviceName,
        serialNumber: plug.equipmentClinicAssignment.serialNumber,
        equipment: {
          id: plug.equipmentClinicAssignment.equipment.id,
          name: plug.equipmentClinicAssignment.equipment.name,
          powerThreshold: plug.equipmentClinicAssignment.equipment.powerThreshold
        },
        clinic: plug.equipmentClinicAssignment.clinic,
        cabin: plug.equipmentClinicAssignment.cabin
      }
    }))
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Error obteniendo enchufes por servicios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 