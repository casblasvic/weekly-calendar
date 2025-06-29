import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ deviceId: string }> }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { deviceId } = await params;
        const body = await request.json();
        const { excludeFromSync } = body;

        if (typeof excludeFromSync !== 'boolean') {
            return NextResponse.json({ 
                error: "excludeFromSync debe ser un booleano" 
            }, { status: 400 });
        }

        // Verificar que el dispositivo pertenece al sistema del usuario
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                id: deviceId,
                systemId: session.user.systemId
            }
        });

        if (!device) {
            return NextResponse.json({ 
                error: "Dispositivo no encontrado" 
            }, { status: 404 });
        }

        // Actualizar el estado de exclusión
        const updatedDevice = await prisma.smartPlugDevice.update({
            where: { id: deviceId },
            data: {
                excludeFromSync,
                updatedAt: new Date()
            }
        });

        console.log(`${excludeFromSync ? '🚫' : '✅'} Dispositivo ${updatedDevice.name} ${excludeFromSync ? 'excluido' : 'incluido'} en sincronización`);

        return NextResponse.json({ 
            success: true,
            message: `Dispositivo ${excludeFromSync ? 'excluido de' : 'incluido en'} sincronización`,
            device: updatedDevice
        });

    } catch (error) {
        console.error('Error al actualizar exclusión:', error);
        return NextResponse.json({ 
            error: "Error al actualizar dispositivo" 
        }, { status: 500 });
    }
} 