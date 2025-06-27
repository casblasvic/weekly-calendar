import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { shellyWebSocketManager } from "@/lib/shelly/websocket-manager";

const prisma = new PrismaClient();

export async function POST(
    request: NextRequest,
    { params }: { params: { deviceId: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { deviceId } = params;
        const body = await request.json();
        const { action } = body; // "on" o "off"

        if (!action || !['on', 'off'].includes(action)) {
            return NextResponse.json({ 
                error: "Acción inválida. Debe ser 'on' o 'off'" 
            }, { status: 400 });
        }

        // Obtener el dispositivo con sus credenciales
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                id: deviceId,
                clinic: {
                    system: {
                        id: session.user.systemId
                    }
                }
            },
            include: {
                credential: true
            }
        });

        if (!device) {
            return NextResponse.json({ 
                error: "Dispositivo no encontrado" 
            }, { status: 404 });
        }

        if (!device.credential) {
            return NextResponse.json({ 
                error: "Dispositivo no tiene credenciales configuradas" 
            }, { status: 400 });
        }

        // Enviar comando a través del WebSocket
        await shellyWebSocketManager.toggleDevice(
            device.credentialId!,
            device.deviceId,
            action === 'on'
        );

        // Actualizar estado optimista en la base de datos
        await prisma.smartPlugDevice.update({
            where: { id: device.id },
            data: {
                relayOn: action === 'on'
            }
        });

        // Registrar el uso del dispositivo si está asociado a una cita
        if (body.appointmentId && device.equipmentId) {
            // Buscar el Equipment con su Device asociado
            const equipment = await prisma.equipment.findUnique({
                where: { id: device.equipmentId },
                include: { device: true }
            });

            if (equipment && equipment.device) {
                await prisma.appointmentDeviceUsage.create({
                    data: {
                        appointmentId: body.appointmentId,
                        equipmentId: device.equipmentId,
                        deviceId: equipment.device.id,
                        systemId: session.user.systemId,
                        startedByUserId: session.user.id,
                        startedAt: new Date(),
                        estimatedMinutes: 60, // Por defecto
                        deviceData: {
                            action,
                            smartPlugDeviceId: device.id
                        }
                    }
                });
            }
        }

        return NextResponse.json({ 
            success: true,
            message: `Dispositivo ${action === 'on' ? 'encendido' : 'apagado'} correctamente`
        });

    } catch (error) {
        console.error('Error al controlar dispositivo:', error);
        return NextResponse.json({ 
            error: "Error al controlar el dispositivo" 
        }, { status: 500 });
    }
} 