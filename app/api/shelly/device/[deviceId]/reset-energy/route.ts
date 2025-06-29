import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { deviceId } = await params;

        // Obtener el dispositivo de la BD
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                deviceId: deviceId,
                systemId: session.user.systemId
            }
        });

        if (!device) {
            return NextResponse.json({ 
                error: "Dispositivo no encontrado" 
            }, { status: 404 });
        }

        // Resetear contadores en la BD local
        await prisma.smartPlugDevice.update({
            where: { id: device.id },
            data: {
                totalEnergy: 0,
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ 
            success: true,
            message: 'Contadores de energía reseteados'
        });

    } catch (error) {
        console.error('Error al resetear contadores de energía:', error);
        return NextResponse.json({ 
            error: "Error al resetear contadores de energía",
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
} 