import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

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