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

    const appointmentId = params.id
    console.log(' [API] Revirtiendo extensión de cita:', appointmentId)

    // Verificar que la cita existe y pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId
      }
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    // Verificar que la cita tiene una duración estimada
    if (!appointment.estimatedDurationMinutes) {
      return NextResponse.json({ 
        error: 'La cita no tiene duración estimada definida' 
      }, { status: 400 })
    }

    // Verificar que la cita está realmente extendida
    if (appointment.durationMinutes <= appointment.estimatedDurationMinutes) {
      return NextResponse.json({ 
        error: 'La cita no está extendida' 
      }, { status: 400 })
    }

    // Calcular nueva hora de fin basada en la duración estimada
    const newEndTime = new Date(appointment.startTime)
    newEndTime.setMinutes(newEndTime.getMinutes() + appointment.estimatedDurationMinutes)

    console.log(' [API] Revirtiendo extensión:', {
      duracionActual: appointment.durationMinutes,
      duracionEstimada: appointment.estimatedDurationMinutes,
      horaFinActual: appointment.endTime,
      horaFinNueva: newEndTime
    })

    // Iniciar transacción para actualizar la cita y eliminar extensiones
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la cita con la duración original
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          endTime: newEndTime,
          durationMinutes: appointment.estimatedDurationMinutes
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
      nuevaDuracion: result.durationMinutes
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
