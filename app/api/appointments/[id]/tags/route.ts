import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Usuario no autenticado" }, { status: 401 });
    }

    const systemId = session.user.systemId;
    if (!systemId) {
      return NextResponse.json({ error: "Sistema no encontrado" }, { status: 404 });
    }

    const { tagIds } = await request.json();
    const resolvedParams = await params;
    const appointmentId = resolvedParams.id;

    // Verificar que la cita existe y pertenece al sistema
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: systemId
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    // Eliminar todas las etiquetas actuales
    await prisma.appointmentTag.deleteMany({
      where: {
        appointmentId: appointmentId
      }
    });

    // Crear las nuevas relaciones de etiquetas
    if (tagIds && tagIds.length > 0) {
      await prisma.appointmentTag.createMany({
        data: tagIds.map((tagId: string) => ({
          appointmentId: appointmentId,
          tagId: tagId
        }))
      });
    }

    // Retornar la cita actualizada con sus etiquetas
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json({
      ...updatedAppointment,
      tags: updatedAppointment?.tags.map(at => at.tagId) || []
    });
  } catch (error) {
    console.error("[PUT /api/appointments/[id]/tags] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar etiquetas" },
      { status: 500 }
    );
  }
}
