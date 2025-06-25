import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE /api/appointments/[id]/revert-extension
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params; // ✅ ARREGLO NextJS 15
    const appointmentId = resolvedParams.id;
    
    // ✅ OBTENER targetDuration del body si se proporciona
    let requestBody = null;
    try {
      requestBody = await request.json();
    } catch {
      // Si no hay body, usar lógica legacy
    }
    
    console.log(' [API] Revirtiendo extensión de cita:', appointmentId, requestBody)

    // Verificar que la cita existe y pertenece al sistema del usuario, incluyendo servicios
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId
      },
      include: {
        services: {
          include: {
            service: true // Incluir detalles del servicio para obtener durationMinutes
          }
        }
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    // ✅ CALCULAR DURACIÓN CORRECTA DE SERVICIOS
    let targetDuration: number;
    
    if (requestBody?.targetDuration) {
      // Usar duración enviada desde frontend (ya calculada)
      targetDuration = requestBody.targetDuration;
      console.log(' [API] Usando duración proporcionada:', targetDuration);
    } else {
      // Calcular suma de servicios desde la base de datos
      if (appointment.services && appointment.services.length > 0) {
        targetDuration = appointment.services.reduce((sum, appointmentService) => {
          return sum + (appointmentService.service.durationMinutes || 0);
        }, 0);
        console.log(' [API] Duración calculada desde servicios:', targetDuration);
      } else if (appointment.estimatedDurationMinutes) {
        // Fallback: usar estimatedDurationMinutes
        targetDuration = appointment.estimatedDurationMinutes;
        console.log(' [API] Usando estimatedDurationMinutes como fallback:', targetDuration);
      } else {
        return NextResponse.json({ 
          error: 'No se puede determinar la duración correcta para restablecer' 
        }, { status: 400 })
      }
    }

    // Verificar que hay algo que revertir
    if (appointment.durationMinutes === targetDuration) {
      return NextResponse.json({ 
        error: 'La cita ya tiene la duración correcta' 
      }, { status: 400 })
    }

    // Calcular nueva hora de fin basada en la duración calculada
    const newEndTime = new Date(appointment.startTime)
    newEndTime.setMinutes(newEndTime.getMinutes() + targetDuration)

    console.log(' [API] Revirtiendo extensión:', {
      duracionActual: appointment.durationMinutes,
      duracionObjetivo: targetDuration,
      horaFinActual: appointment.endTime,
      horaFinNueva: newEndTime,
      servicios: appointment.services.map(s => ({ 
        nombre: s.service.name, 
        duracion: s.service.durationMinutes 
      }))
    })

    // Iniciar transacción para actualizar la cita y eliminar extensiones
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la cita con la duración correcta
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          endTime: newEndTime,
          durationMinutes: targetDuration
        }
      })

      // 2. Eliminar todos los registros de extensión asociados
      const deletedExtensions = await tx.appointmentExtension.deleteMany({
        where: { appointmentId: appointmentId }
      })
      
      if (deletedExtensions.count > 0) {
        console.log(` [API] Eliminados ${deletedExtensions.count} registros de extensión`)
      }

      return updatedAppointment
    })

    console.log(' [API] Extensión revertida exitosamente:', {
      citaId: result.id,
      nuevaDuracion: result.durationMinutes,
      duracionObjetivo: targetDuration
    })

    // Devolver la cita actualizada
    return NextResponse.json({
      success: true,
      appointment: {
        ...result,
        startTime: result.startTime.toISOString(),
        endTime: result.endTime.toISOString(),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error(' [API] Error al revertir extensión:', error)
    return NextResponse.json(
      { error: 'Error al revertir la extensión de la cita' },
      { status: 500 }
    )
  }
}
