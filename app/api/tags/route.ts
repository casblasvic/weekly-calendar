import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/tags - Obtener todas las etiquetas
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      where: {
        systemId: session.user.systemId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/tags - Crear una nueva etiqueta
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        description,
        systemId: session.user.systemId,
        isActive: true
      }
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/tags - Actualizar una etiqueta
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, color, description, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la etiqueta pertenece al sistema del usuario
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: id,
        systemId: session.user.systemId
      }
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    const updatedTag = await prisma.tag.update({
      where: { id: id },
      data: {
        name: name ?? existingTag.name,
        color: color ?? existingTag.color,
        description: description ?? existingTag.description,
        isActive: isActive ?? existingTag.isActive
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

// DELETE /api/tags - Eliminar una etiqueta
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    // Verificar que la etiqueta pertenece al sistema del usuario
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: id,
        systemId: session.user.systemId
      }
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      );
    }

    // Verificar si la etiqueta está siendo usada
    const appointmentsWithTag = await prisma.appointmentTag.count({
      where: { tagId: id }
    });

    if (appointmentsWithTag > 0) {
      // Soft delete - marcar como inactiva
      await prisma.tag.update({
        where: { id: id },
        data: { isActive: false }
      });
      
      return NextResponse.json(
        { message: 'Tag deactivated (in use)' },
        { status: 200 }
      );
    }

    // Hard delete si no está en uso
    await prisma.tag.delete({
      where: { id: id }
    });

    return NextResponse.json(
      { message: 'Tag deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
