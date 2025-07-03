import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { autoShutdownEnabled } = await request.json();
    const { id } = params;

    // Actualizar el campo autoShutdownEnabled del dispositivo
    const updatedDevice = await prisma.smartPlugDevice.update({
      where: { 
        id: id,
        systemId: session.user.systemId 
      },
      data: { 
        autoShutdownEnabled: autoShutdownEnabled 
      }
    });

    return NextResponse.json({ 
      success: true,
      autoShutdownEnabled: updatedDevice.autoShutdownEnabled 
    });

  } catch (error) {
    console.error('Error updating autoShutdownEnabled:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 