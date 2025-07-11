import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/shelly/crypto";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        // Obtener dispositivos del sistema
        const devices = await prisma.smartPlugDevice.findMany({
            where: {
                systemId: session.user.systemId
            },
            include: {
                credential: true
            }
        });

        const updatedDevices = [];

        // Agrupar por credencial para optimizar llamadas
        const devicesByCredential = devices.reduce((acc, device) => {
            const credId = device.credentialId;
            if (!acc[credId]) acc[credId] = [];
            acc[credId].push(device);
            return acc;
        }, {} as Record<string, any[]>);

        for (const [credentialId, credDevices] of Object.entries(devicesByCredential)) {
            const credential = credDevices[0].credential;
            
            // 🚫 VERIFICAR QUE LA CREDENCIAL ESTÉ CONECTADA ANTES DE CONSULTAR API
            if (credential.status !== 'connected') {
                console.warn(`⚠️ [API] Credencial ${credentialId} no está conectada (estado: ${credential.status}) - saltando consulta de estado`);
                continue;
            }

            // 🚫 VERIFICAR QUE EL WEBSOCKET ESTÉ ACTIVO PARA ESTA CREDENCIAL
            const wsConnection = await prisma.webSocketConnection.findFirst({
                where: {
                    type: 'SHELLY',
                    referenceId: credentialId,
                    systemId: session.user.systemId
                },
                select: {
                    status: true
                }
            });

            if (!wsConnection || wsConnection.status !== 'connected') {
                console.warn(`⚠️ [API] WebSocket no está conectado para credencial ${credentialId} - saltando consulta de estado`);
                continue;
            }
            
            try {
                const accessToken = decrypt(credential.accessToken);
                
                // Obtener estados de todos los dispositivos de esta credencial
                const statusResponse = await fetch(`${credential.apiHost}/device/all_status`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    
                    // Actualizar cada dispositivo
                    for (const device of credDevices) {
                        const deviceStatus = statusData.data?.devices_status?.[device.deviceId];
                        
                        if (deviceStatus) {
                            // Extraer estado del relay
                            let relayOn = false;
                            if (deviceStatus['switch:0']) {
                                relayOn = deviceStatus['switch:0'].output || false;
                            } else if (deviceStatus.relays && deviceStatus.relays[0]) {
                                relayOn = deviceStatus.relays[0].ison || false;
                            }

                            // Actualizar en BD
                            await prisma.smartPlugDevice.update({
                                where: { id: device.id },
                                data: {
                                    relayOn,
                                    online: deviceStatus._dev_info?.online !== false,
                                    currentPower: deviceStatus['switch:0']?.apower || deviceStatus.meters?.[0]?.power || null,
                                    lastSeenAt: new Date()
                                }
                            });

                            updatedDevices.push({
                                id: device.id,
                                deviceId: device.deviceId,
                                name: device.name,
                                online: deviceStatus._dev_info?.online !== false,
                                relayOn,
                                currentPower: deviceStatus['switch:0']?.apower || deviceStatus.meters?.[0]?.power || null
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error actualizando estados para credencial ${credentialId}:`, error);
            }
        }

        return NextResponse.json({ 
            success: true,
            updatedDevices,
            count: updatedDevices.length
        });

    } catch (error) {
        console.error('Error actualizando estados:', error);
        return NextResponse.json({ 
            error: "Error al actualizar estados" 
        }, { status: 500 });
    }
} 