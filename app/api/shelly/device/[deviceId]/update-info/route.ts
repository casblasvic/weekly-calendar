import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
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

        // Por ahora, simular información de actualización
        // En una implementación real, aquí se consultaría la API de Shelly
        // para obtener información real de actualizaciones disponibles
        
        const updateInfo = {
            available: false, // Por defecto no hay actualizaciones
            version: device.firmwareVersion || 'N/A',
            current_version: device.firmwareVersion || 'N/A'
        };

        return NextResponse.json(updateInfo);

    } catch (error) {
        console.error('Error al obtener información de actualización:', error);
        return NextResponse.json({ 
            error: "Error al obtener información de actualización",
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
} 