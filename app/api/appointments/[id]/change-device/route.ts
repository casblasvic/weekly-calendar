/**
 * 🔄 API: Cambio de Dispositivo para Cita Activa
 * 
 * PROPÓSITO: Permite cambiar el dispositivo utilizado en una cita manteniendo
 * los tiempos de uso registrados para evitar fraude por cambio de equipamiento.
 * 
 * FLUJO:
 * 1. Verificar que existe un uso activo para la cita
 * 2. Validar que el nuevo dispositivo esté disponible
 * 3. Actualizar el registro manteniendo tiempos y consumo
 * 4. Notificar cambio via WebSocket
 * 
 * SEGURIDAD:
 * - Mantiene actualMinutes, energyConsumption, startedAt
 * - Solo cambia equipmentClinicAssignmentId y deviceId
 * - Registra el cambio en logs de auditoría
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 🔐 Verificar autenticación
    const session = await getServerAuthSession()
    if (!session?.user?.systemId) {
      return NextResponse.json({ 
        error: 'No autenticado' 
      }, { status: 401 })
    }

    const appointmentId = params.id
    const { systemId } = session.user
    
    // 📝 Obtener datos del request
    const body = await request.json()
    const { 
      newEquipmentClinicAssignmentId, 
      newDeviceId,
      reason = 'Cambio de dispositivo durante tratamiento'
    } = body

    if (!newEquipmentClinicAssignmentId || !newDeviceId) {
      return NextResponse.json({ 
        error: 'newEquipmentClinicAssignmentId y newDeviceId son requeridos' 
      }, { status: 400 })
    }

    // 🔍 Buscar uso activo para esta cita
    const activeUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId,
        systemId,
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        endedAt: null
      },
      include: {
        appointment: {
          select: { id: true, startTime: true, endTime: true }
        },
        equipmentClinicAssignment: {
          select: {
            id: true,
            equipment: { select: { name: true } },
            clinic: { select: { name: true } }
          }
        }
      }
    })

    if (!activeUsage) {
      return NextResponse.json({ 
        error: 'No se encontró un uso activo de dispositivo para esta cita' 
      }, { status: 404 })
    }

    // 🔍 Verificar que el nuevo dispositivo existe y está disponible
    const newAssignment = await prisma.equipmentClinicAssignment.findFirst({
      where: {
        id: newEquipmentClinicAssignmentId,
        isActive: true
      },
      include: {
        equipment: { select: { name: true } },
        clinic: { select: { name: true } },
        smartPlugDevice: {
          select: {
            id: true,
            deviceId: true,
            name: true,
            online: true
          }
        }
      }
    })

    if (!newAssignment) {
      return NextResponse.json({ 
        error: 'El nuevo dispositivo no existe o no está activo' 
      }, { status: 404 })
    }

    // 🔍 Verificar que el nuevo dispositivo no esté siendo usado por otra cita
    const conflictingUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        appointmentId: { not: appointmentId },
        OR: [
          { equipmentClinicAssignmentId: newEquipmentClinicAssignmentId },
          { deviceId: newDeviceId }
        ],
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        endedAt: null,
        systemId
      }
    })

    if (conflictingUsage) {
      return NextResponse.json({ 
        error: 'El nuevo dispositivo ya está siendo usado por otra cita' 
      }, { status: 409 })
    }

    // 📊 Calcular tiempo actual para mantener continuidad
    const now = new Date()
    const actualMinutes = activeUsage.actualMinutes || 0

    // 🔄 Actualizar el registro manteniendo tiempos y consumo
    const updatedUsage = await prisma.appointmentDeviceUsage.update({
      where: { id: activeUsage.id },
      data: {
        // ✅ CAMBIAR: Dispositivo y asignación
        equipmentClinicAssignmentId: newEquipmentClinicAssignmentId,
        deviceId: newDeviceId,
        
        // 🛡️ MANTENER: Tiempos y consumo para evitar fraude
        // startedAt: se mantiene igual
        // actualMinutes: se mantiene igual
        // energyConsumption: se mantiene igual
        // estimatedMinutes: se mantiene igual
        
        // 📝 REGISTRAR: Metadatos del cambio
        deviceData: {
          ...(activeUsage.deviceData as any || {}),
          deviceChange: {
            changedAt: now.toISOString(),
            previousDeviceId: activeUsage.deviceId,
            previousAssignmentId: activeUsage.equipmentClinicAssignmentId,
            newDeviceId,
            newAssignmentId: newEquipmentClinicAssignmentId,
            reason,
            changedByUserId: session.user.id
          }
        }
      },
      include: {
        appointment: {
          select: { id: true, startTime: true, endTime: true }
        },
        equipmentClinicAssignment: {
          select: {
            equipment: { select: { name: true } },
            clinic: { select: { name: true } }
          }
        }
      }
    })

    // 📡 Notificar cambio via WebSocket
    // TODO: Implementar notificación WebSocket para actualizar UI en tiempo real

    console.log('🔄 [DEVICE_CHANGE] Dispositivo cambiado exitosamente:', {
      appointmentId,
      previousDevice: activeUsage.deviceId,
      newDevice: newDeviceId,
      actualMinutes,
      energyConsumption: activeUsage.energyConsumption,
      reason
    })

    return NextResponse.json({
      success: true,
      message: 'Dispositivo cambiado exitosamente',
      data: {
        usageId: updatedUsage.id,
        previousDevice: {
          deviceId: activeUsage.deviceId,
          equipmentName: activeUsage.equipmentClinicAssignment?.equipment?.name
        },
        newDevice: {
          deviceId: newDeviceId,
          equipmentName: newAssignment.equipment.name
        },
        preservedData: {
          actualMinutes: updatedUsage.actualMinutes,
          energyConsumption: updatedUsage.energyConsumption,
          startedAt: updatedUsage.startedAt
        }
      }
    })

  } catch (error) {
    console.error('❌ [DEVICE_CHANGE] Error cambiando dispositivo:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
} 