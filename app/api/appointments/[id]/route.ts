import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const appointmentId = params.id;

    // Verificar que la cita existe y pertenece al sistema
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: systemId
      },
      include: {
        services: {
          where: {
            validatedAt: {
              not: null
            }
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    // Verificar si tiene servicios validados
    if (appointment.services.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una cita con servicios validados" },
        { status: 400 }
      );
    }

    // Eliminar en cascada (el orden es importante)
    // 1. Eliminar etiquetas
    await prisma.appointmentTag.deleteMany({
      where: { appointmentId: appointmentId }
    });

    // 2. Eliminar extensiones
    await prisma.appointmentExtension.deleteMany({
      where: { appointmentId: appointmentId }
    });

    // 3. Eliminar servicios
    await prisma.appointmentService.deleteMany({
      where: { appointmentId: appointmentId }
    });

    // 4. Finalmente eliminar la cita
    await prisma.appointment.delete({
      where: { id: appointmentId }
    });

    return NextResponse.json({ message: "Cita eliminada correctamente" });
  } catch (error) {
    console.error("[DELETE /api/appointments/[id]] Error:", error);
    return NextResponse.json(
      { error: "Error al eliminar la cita" },
      { status: 500 }
    );
  }
}
