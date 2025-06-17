import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/tags/[id] - Obtener una etiqueta específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const tag = await prisma.tag.findFirst({
      where: {
        id: id,
        systemId: session.user.systemId,
        isActive: true
      }
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/tags/[id] - Actualizar una etiqueta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color, description, isActive } = body;

    // Verificar que la etiqueta existe y pertenece al sistema del usuario
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: id,
        systemId: session.user.systemId
      }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const updatedTag = await prisma.tag.update({
      where: {
        id: id
      },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Eliminar una etiqueta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que la etiqueta existe y pertenece al sistema del usuario
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: id,
        systemId: session.user.systemId
      }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Verificar si la etiqueta está siendo usada en alguna cita
    const appointmentsWithTag = await prisma.appointment.count({
      where: {
        tags: {
          some: {
            tagId: id
          }
        },
        systemId: session.user.systemId
      }
    });

    if (appointmentsWithTag > 0) {
      // Si está en uso, la marcamos como inactiva en lugar de eliminarla
      const updatedTag = await prisma.tag.update({
        where: {
          id: id
        },
        data: {
          isActive: false
        }
      });
      return NextResponse.json({ 
        message: 'Tag marked as inactive because it is in use',
        tag: updatedTag 
      });
    }

    // Si no está en uso, la eliminamos permanentemente
    await prisma.tag.delete({
      where: {
        id: id
      }
    });

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
