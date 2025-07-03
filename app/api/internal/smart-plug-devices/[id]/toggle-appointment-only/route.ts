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

    const { appointmentOnlyMode } = await request.json();
    const { id } = params;

    // Actualizar el campo appointmentOnlyMode del dispositivo
    const updatedDevice = await prisma.smartPlugDevice.update({
      where: { 
        id: id,
        systemId: session.user.systemId 
      },
      data: { 
        appointmentOnlyMode: appointmentOnlyMode 
      }
    });

    return NextResponse.json({ 
      success: true,
      appointmentOnlyMode: updatedDevice.appointmentOnlyMode 
    });

  } catch (error) {
    console.error('Error updating appointmentOnlyMode:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 