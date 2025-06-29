import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = Promise<{ id: string }>;

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    try {
        const body = await request.json();
        
        // Verificar que el enchufe pertenece al sistema del usuario
        const existingPlug = await prisma.smartPlugDevice.findFirst({
            where: {
                id,
                systemId: session.user.systemId
            }
        });

        if (!existingPlug) {
            return NextResponse.json({ error: "Enchufe no encontrado" }, { status: 404 });
        }

        // Actualizar el enchufe
        const updatedDevice = await prisma.smartPlugDevice.update({
            where: { id },
            data: {
                name: body.name,
                deviceId: body.deviceId,
                deviceIp: body.deviceIp,
                equipmentId: body.equipmentId,
                clinicId: body.clinicId,
            },
            include: {
                equipment: {
                    select: {
                        name: true,
                        clinicId: true,
                        clinic: {
                            select: {
                                name: true,
                            }
                        }
                    },
                },
            },
        });

        return NextResponse.json(updatedDevice);

    } catch (error) {
        console.error("Error updating smart plug device:", error);
        return NextResponse.json({ error: "Error al actualizar el dispositivo" }, { status: 500 });
    }
}

// GET /api/internal/smart-plug-devices/[id]
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    // ... (Implementación si se necesita obtener un solo dispositivo)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const session = await auth();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validar que el dispositivo pertenezca al sistema del usuario
    const device = await prisma.smartPlugDevice.findFirst({
      where: {
        id,
        systemId: session.user.systemId
      }
    });

    if (!device) {
      return NextResponse.json({ error: 'Dispositivo no encontrado' }, { status: 404 });
    }

    // Construir objeto de actualización con solo los campos proporcionados
    const updateData: any = {};
    
    // Campos básicos
    if (body.name !== undefined) updateData.name = body.name;
    if (body.clinicId !== undefined) updateData.clinicId = body.clinicId;
    if (body.equipmentId !== undefined) updateData.equipmentId = body.equipmentId;
    
    // Campos de configuración
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.autoUpdate !== undefined) updateData.autoUpdate = body.autoUpdate;
    if (body.wifiBackupEnabled !== undefined) updateData.wifiBackupEnabled = body.wifiBackupEnabled;
    if (body.wifiBackupSsid !== undefined) updateData.wifiBackupSsid = body.wifiBackupSsid;
    if (body.apModeEnabled !== undefined) updateData.apModeEnabled = body.apModeEnabled;
    if (body.autoOffEnabled !== undefined) updateData.autoOffEnabled = body.autoOffEnabled;
    if (body.autoOffDelay !== undefined) updateData.autoOffDelay = body.autoOffDelay;
    if (body.powerLimit !== undefined) updateData.powerLimit = body.powerLimit;
    if (body.ledBrightness !== undefined) updateData.ledBrightness = body.ledBrightness;
    if (body.ledColorMode !== undefined) updateData.ledColorMode = body.ledColorMode;
    if (body.ledColorR !== undefined) updateData.ledColorR = body.ledColorR;
    if (body.ledColorG !== undefined) updateData.ledColorG = body.ledColorG;
    if (body.ledColorB !== undefined) updateData.ledColorB = body.ledColorB;
    if (body.ledNightMode !== undefined) updateData.ledNightMode = body.ledNightMode;

    // Actualizar el dispositivo
    const updatedDevice = await prisma.smartPlugDevice.update({
      where: { id },
      data: updateData,
      include: {
        credential: true,
        equipment: true,
        clinic: true
      }
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    console.error('Error actualizando dispositivo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar dispositivo' },
      { status: 500 }
    );
  }
}

// DELETE /api/internal/smart-plug-devices/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    try {
        // Verificar que el enchufe pertenece al sistema del usuario
        const smartPlug = await prisma.smartPlugDevice.findFirst({
            where: {
                id,
                systemId: session.user.systemId
            }
        });

        if (!smartPlug) {
            return NextResponse.json({ error: "Enchufe no encontrado" }, { status: 404 });
        }

        // Eliminar registros de uso asociados al equipo del enchufe
        // Como AppointmentDeviceUsage se relaciona con Equipment, no directamente con SmartPlugDevice
        await prisma.appointmentDeviceUsage.deleteMany({
            where: {
                equipmentId: smartPlug.equipmentId,
                systemId: session.user.systemId
            }
        });

        // Eliminar el enchufe inteligente
        await prisma.smartPlugDevice.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error deleting smart plug device:", error);
        return NextResponse.json({ error: "Error al eliminar el dispositivo" }, { status: 500 });
    }
} 