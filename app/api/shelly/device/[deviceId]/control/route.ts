/**
 * ========================================
 * PLUGIN SHELLY - ENDPOINT DE CONTROL DE DISPOSITIVOS
 * ========================================
 * 
 * 🔌 INTEGRACIÓN SHELLY CLOUD
 * Este endpoint controla dispositivos Shelly a través de Shelly Cloud API.
 * NO utiliza conexiones directas a las IPs locales de los dispositivos.
 * 
 * 📡 CONFIGURACIÓN DE CONEXIÓN:
 * - Host API: Se obtiene del campo `apiHost` en la tabla `ShellyCredential`
 * - URL Base: Almacenada en `ShellyCredential.apiHost` (ej: "shelly-103-eu.shelly.cloud")
 * - Autenticación: Tokens OAuth2 almacenados en `ShellyCredential.accessToken`
 * 
 * 🆔 MAPEO AUTOMÁTICO DE DISPOSITIVOS:
 * - deviceId (BD): ID interno almacenado en `SmartPlugDevice.deviceId`
 * - cloudId: ID numérico de Shelly Cloud (NO almacenado en BD)
 * - El mapeo se construye automáticamente desde eventos WebSocket
 * - Ejemplo: deviceId "b0b21c12dd94" → cloudId "194279021665684"
 * 
 * 🏗️ FLUJO DE CONTROL:
 * 1. Recibe deviceId de la BD en la URL
 * 2. Busca dispositivo en tabla `SmartPlugDevice`
 * 3. Obtiene credenciales desde tabla `ShellyCredential`
 * 4. WebSocket Manager mapea deviceId → cloudId automáticamente
 * 5. Envía comando WebSocket usando cloudId correcto
 * 
 * 📊 TABLAS UTILIZADAS:
 * - `SmartPlugDevice`: Dispositivos vinculados (deviceId, credentialId)
 * - `ShellyCredential`: Credenciales OAuth2 y apiHost
 * - `WebSocketLog`: Logs de comandos enviados (opcional)
 * 
 * ⚡ COMANDOS SOPORTADOS:
 * - "on": Encender dispositivo
 * - "off": Apagar dispositivo
 * - Usa WebSocket Commands via Shelly Cloud
 * - Formato: {"method": "Shelly:CommandRequest", "params": {...}}
 * 
 * 🎯 USO:
 * POST /api/shelly/device/{deviceId}/control
 * Body: {"action": "on" | "off"}
 * 
 * Donde {deviceId} es el valor de `SmartPlugDevice.deviceId`
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { shellyWebSocketManager } from "@/lib/shelly/websocket-manager";

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
        const body = await request.json();
        const { action } = body; // "on" o "off"

        if (!action || !['on', 'off'].includes(action)) {
            return NextResponse.json({ 
                error: "Acción inválida. Debe ser 'on' o 'off'" 
            }, { status: 400 });
        }

        // Obtener el dispositivo con sus credenciales usando el deviceId de Shelly
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                deviceId: deviceId, // Usar deviceId en lugar de id
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

        if (!device.credential) {
            return NextResponse.json({ 
                error: "Dispositivo no tiene credenciales configuradas" 
            }, { status: 400 });
        }

        console.log(`🎛️ [CONTROL] Controlando dispositivo ${device.name} (${deviceId}): ${action.toUpperCase()}`);

        // 🎯 USAR WEBSOCKET COMMAND CON EL DEVICE ID ORIGINAL
        await shellyWebSocketManager.controlDevice(
            device.credential.id,
            deviceId, // Usar el deviceId original, el WebSocket manager hará el mapeo interno
            action as 'on' | 'off'
        );

        // Actualizar estado en la base de datos
        await prisma.smartPlugDevice.update({
            where: { id: device.id },
            data: {
                relayOn: action === 'on',
                updatedAt: new Date()
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
                if (action === 'on') {
                    // Iniciar uso del dispositivo
                    await prisma.appointmentDeviceUsage.create({
                        data: {
                            appointmentId: body.appointmentId,
                            equipmentId: device.equipmentId,
                            deviceId: equipment.device.id,
                            systemId: session.user.systemId,
                            startedByUserId: session.user.id,
                            startedAt: new Date(),
                            estimatedMinutes: body.estimatedMinutes || 60,
                            deviceData: {
                                action,
                                smartPlugDeviceId: device.id,
                                initialPower: device.currentPower || 0,
                                initialEnergy: device.totalEnergy || 0
                            }
                        }
                    });
                } else {
                    // Finalizar uso del dispositivo
                    const usage = await prisma.appointmentDeviceUsage.findFirst({
                        where: {
                            appointmentId: body.appointmentId,
                            equipmentId: device.equipmentId,
                            endedAt: null
                        },
                        orderBy: {
                            startedAt: 'desc'
                        }
                    });

                    if (usage) {
                        const actualMinutes = Math.round(
                            (new Date().getTime() - usage.startedAt.getTime()) / 60000
                        );
                        
                        await prisma.appointmentDeviceUsage.update({
                            where: { id: usage.id },
                            data: {
                                endedAt: new Date(),
                                actualMinutes,
                                energyConsumption: device.currentPower 
                                    ? (device.currentPower * actualMinutes) / 60000 // kWh
                                    : null,
                                deviceData: {
                                    ...(usage.deviceData as any || {}),
                                    finalPower: device.currentPower || 0,
                                    finalEnergy: device.totalEnergy || 0,
                                    action: 'off'
                                }
                            }
                        });
                    }
                }
            }
        }

        return NextResponse.json({ 
            success: true,
            message: `Dispositivo ${action === 'on' ? 'encendido' : 'apagado'} correctamente`
        });

    } catch (error) {
        console.error('Error al controlar dispositivo:', error);
        return NextResponse.json({ 
            error: "Error al controlar el dispositivo",
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
} 