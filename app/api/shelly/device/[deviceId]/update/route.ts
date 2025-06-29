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

        // Por ahora, solo simular la actualización
        // En una implementación real, aquí se enviaría el comando de actualización
        // al dispositivo a través de la API de Shelly
        
        return NextResponse.json({ 
            success: true,
            message: 'Actualización de firmware iniciada'
        });

    } catch (error) {
        console.error('Error al iniciar actualización de firmware:', error);
        return NextResponse.json({ 
            error: "Error al iniciar actualización de firmware",
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
} 