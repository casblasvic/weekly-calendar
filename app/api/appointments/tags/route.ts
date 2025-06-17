import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/appointments/tags?appointmentId=xxx - Obtener etiquetas de una cita
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la cita pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const tags = appointment.tags.map(at => at.tag);
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching appointment tags:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/appointments/tags - Asociar etiqueta a una cita (sin guardar la cita)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, tagId } = body;

    if (!appointmentId || !tagId) {
      return NextResponse.json(
        { error: 'Appointment ID and Tag ID are required' },
        { status: 400 }
      );
    }

    // Verificar que la cita pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verificar que la etiqueta pertenece al sistema del usuario
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        systemId: session.user.systemId,
        isActive: true
      }
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Crear la asociación si no existe
    const existingAssociation = await prisma.appointmentTag.findUnique({
      where: {
        appointmentId_tagId: {
          appointmentId,
          tagId
        }
      }
    });

    if (existingAssociation) {
      return NextResponse.json(
        { message: 'Tag already associated' },
        { status: 200 }
      );
    }

    const appointmentTag = await prisma.appointmentTag.create({
      data: {
        appointmentId,
        tagId
      },
      include: {
        tag: true
      }
    });

    return NextResponse.json(appointmentTag.tag, { status: 201 });
  } catch (error) {
    console.error('Error associating tag to appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/appointments/tags - Desasociar etiqueta de una cita
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const tagId = searchParams.get('tagId');

    if (!appointmentId || !tagId) {
      return NextResponse.json(
        { error: 'Appointment ID and Tag ID are required' },
        { status: 400 }
      );
    }

    // Verificar que la cita pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Eliminar la asociación
    try {
      await prisma.appointmentTag.delete({
        where: {
          appointmentId_tagId: {
            appointmentId,
            tagId
          }
        }
      });
    } catch (error) {
      // Si no existe la asociación, no es un error
      return NextResponse.json(
        { message: 'Tag association not found' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Tag disassociated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error disassociating tag from appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/appointments/tags - Actualizar todas las etiquetas de una cita
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appointmentId, tagIds } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la cita pertenece al sistema del usuario
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        systemId: session.user.systemId
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Si tagIds está presente y es un array
    if (Array.isArray(tagIds)) {
      // Verificar que todas las etiquetas existen y pertenecen al sistema
      const validTags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          systemId: session.user.systemId,
          isActive: true
        }
      });

      const validTagIds = validTags.map(tag => tag.id);

      // Eliminar todas las etiquetas actuales
      await prisma.appointmentTag.deleteMany({
        where: {
          appointmentId: appointmentId
        }
      });

      // Crear las nuevas relaciones con las etiquetas válidas
      if (validTagIds.length > 0) {
        await prisma.appointmentTag.createMany({
          data: validTagIds.map(tagId => ({
            appointmentId: appointmentId,
            tagId: tagId
          })),
          skipDuplicates: true
        });
      }
    }

    // Devolver las etiquetas actualizadas
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

    const tags = updatedAppointment?.tags.map(at => at.tag) || [];
    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error updating appointment tags:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
