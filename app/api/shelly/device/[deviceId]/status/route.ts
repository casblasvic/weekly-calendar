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

        // Obtener el dispositivo de la BD con estado actual
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                deviceId: deviceId,
                systemId: session.user.systemId
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

        // Construir respuesta en formato UnifiedDeviceStatus
        const status = {
            generation: parseInt(device.generation || '2'),
            deviceId: device.deviceId,
            model: device.modelCode,
            name: device.name,
            online: device.online,
            relay: {
                isOn: device.relayOn,
                source: device.relaySource || 'unknown',
                hasTimer: false,
                timerRemaining: undefined,
            },
            power: {
                current: device.currentPower || 0,
                voltage: device.voltage,
                current_amps: device.current,
                total: device.totalEnergy || 0,
                temperature: device.temperature,
            },
            wifi: {
                connected: device.online,
                ssid: device.wifiSsid,
                ip: device.deviceIp,
                rssi: device.wifiRssi,
            },
            cloud: {
                connected: device.credential?.status === 'connected',
            },
            lastUpdate: device.lastSeenAt || device.updatedAt,
        };

        return NextResponse.json(status);

    } catch (error) {
        console.error('Error al obtener estado del dispositivo:', error);
        return NextResponse.json({ 
            error: "Error al obtener estado del dispositivo",
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
} 