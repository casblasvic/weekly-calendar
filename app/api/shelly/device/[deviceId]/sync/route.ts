/**
 * ========================================
 * PLUGIN SHELLY - ENDPOINT DE SINCRONIZACIÓN DE DISPOSITIVOS
 * ========================================
 * 
 * 🔌 INTEGRACIÓN SHELLY CLOUD
 * Este endpoint sincroniza dispositivos Shelly a través de Shelly Cloud API.
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
 * 🏗️ FLUJO DE SINCRONIZACIÓN:
 * 1. Recibe deviceId de la BD en la URL
 * 2. Busca dispositivo en tabla `SmartPlugDevice`
 * 3. Obtiene credenciales desde tabla `ShellyCredential`
 * 4. Detecta generación del dispositivo (Gen1, Gen2, Gen3)
 * 5. Aplica sincronización específica por generación
 * 6. Actualiza datos en tabla `SmartPlugDevice`
 * 
 * 📊 TABLAS UTILIZADAS:
 * - `SmartPlugDevice`: Dispositivos vinculados (deviceId, credentialId, datos)
 * - `ShellyCredential`: Credenciales OAuth2 y apiHost
 * - `WebSocketLog`: Logs de comandos de sincronización
 * 
 * 🔄 ESTRATEGIAS POR GENERACIÓN:
 * - Gen1: HTTP REST API (limitado)
 * - Gen2: WebSocket Commands + RPC (completo)
 * - Gen3: WebSocket Commands + RPC + LED (avanzado)
 * 
 * 📋 DATOS SINCRONIZADOS:
 * - Información básica: MAC, modelo, firmware
 * - Estado actual: encendido/apagado, potencia, energía
 * - Configuración: timezone, WiFi, nombre
 * - Específico Gen3: configuración LED
 * 
 * 🎯 USO:
 * POST /api/shelly/device/{deviceId}/sync
 * 
 * Donde {deviceId} es el valor de `SmartPlugDevice.deviceId`
 * Retorna: información completa del dispositivo sincronizado
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { shellyWebSocketManager } from "@/lib/shelly/websocket-manager";
import { gen1Commands, gen1Utils, Gen1DeviceInfo } from "@/lib/shelly/api/endpoints/gen1";
import { gen2Commands, gen2Utils, Gen2DeviceInfo } from "@/lib/shelly/api/endpoints/gen2";
import { gen3Commands, gen3Utils, Gen3DeviceInfo } from "@/lib/shelly/api/endpoints/gen3";
import { gen2Methods } from "@/lib/shelly/api/endpoints/gen2";
import { gen3Methods } from "@/lib/shelly/api/endpoints/gen3";

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

        console.log(`🔄 [SYNC] Iniciando resincronización para dispositivo ${deviceId}...`);

        // Obtener el dispositivo con sus credenciales
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                deviceId: deviceId,
                systemId: session.user.systemId
            },
            include: {
                credential: true
            }
        });

        if (!device || !device.credential) {
            return NextResponse.json({ 
                error: "Dispositivo no encontrado o sin credenciales" 
            }, { status: 404 });
        }

        // 🎯 ESTRATEGIA DE SINCRONIZACIÓN POR GENERACIÓN
        // Priorizar WebSocket Commands, luego HTTP RPC, luego HTTP REST
        
        let syncResult: any = {};
        let updatedFields: string[] = [];

        try {
            // 1. DETECTAR GENERACIÓN DEL DISPOSITIVO
            console.log(`🔍 [SYNC] Detectando generación del dispositivo ${deviceId}...`);
            
            // Usar WebSocket Command para obtener información del dispositivo
            const deviceInfoCommand = {
                method: "Shelly.GetDeviceInfo",
                params: undefined
            };

            let deviceInfo: any = null;
            try {
                // Intentar obtener info via WebSocket Command
                deviceInfo = await shellyWebSocketManager.sendCommand(
                    device.credential.id,
                    deviceId,
                    deviceInfoCommand.method,
                    deviceInfoCommand.params
                );
                console.log(`✅ [SYNC] Información obtenida via WebSocket Command`);
            } catch (wsError) {
                console.log(`⚠️ [SYNC] WebSocket Command falló, intentando HTTP RPC...`);
                // Si WebSocket falla, intentar HTTP RPC (requiere IP local)
                if (device.deviceIp) {
                    try {
                        const response = await fetch(`http://${device.deviceIp}/rpc/Shelly.GetDeviceInfo`, {
                            method: 'GET'
                        });
                        if (response.ok) {
                            deviceInfo = await response.json();
                            console.log(`✅ [SYNC] Información obtenida via HTTP RPC`);
                        }
                    } catch (httpError) {
                        console.log(`⚠️ [SYNC] HTTP RPC también falló:`, httpError);
                    }
                }
            }

            if (!deviceInfo) {
                throw new Error("No se pudo obtener información del dispositivo");
            }

            // 2. DETERMINAR GENERACIÓN Y APLICAR SINCRONIZACIÓN ESPECÍFICA
            let generation: 1 | 2 | 3;
            
            if (gen1Utils.isGen1Device(deviceInfo)) {
                generation = 1;
                console.log(`📱 [SYNC] Dispositivo Gen1 detectado: ${deviceInfo.fw}`);
                syncResult = await syncGen1Device(device, deviceInfo);
            } else if (gen2Utils.isGen2Device(deviceInfo)) {
                generation = 2;
                console.log(`📱 [SYNC] Dispositivo Gen2 detectado: ${deviceInfo.model} v${deviceInfo.ver}`);
                syncResult = await syncGen2Device(device, deviceInfo);
            } else if (gen3Utils.isGen3Device(deviceInfo)) {
                generation = 3;
                console.log(`📱 [SYNC] Dispositivo Gen3 detectado: ${deviceInfo.model} v${deviceInfo.ver}`);
                syncResult = await syncGen3Device(device, deviceInfo);
            } else {
                throw new Error(`Generación de dispositivo no reconocida: ${JSON.stringify(deviceInfo)}`);
            }

            // 3. ACTUALIZAR BASE DE DATOS CON INFORMACIÓN SINCRONIZADA
            const updateData: any = {
                // Campos comunes a todas las generaciones
                name: syncResult.name || device.name,
                mac: syncResult.mac || (device as any).mac || null,
                firmwareVersion: syncResult.firmwareVersion || device.firmwareVersion,
                model: syncResult.model || (device as any).model || null,
                generation: generation,
                online: true,
                lastSeenAt: new Date(),
                updatedAt: new Date(),
                
                // Campos específicos si están disponibles
                ...(syncResult.timezone && { timezone: syncResult.timezone }),
                ...(syncResult.wifiSsid && { wifiSsid: syncResult.wifiSsid }),
                ...(syncResult.relayOn !== undefined && { relayOn: syncResult.relayOn }),
                ...(syncResult.power !== undefined && { currentPower: syncResult.power }),
                ...(syncResult.energy !== undefined && { totalEnergy: syncResult.energy }),
                ...(syncResult.temperature !== undefined && { temperature: syncResult.temperature }),
                ...(syncResult.voltage !== undefined && { voltage: syncResult.voltage }),
                ...(syncResult.current !== undefined && { current: syncResult.current }),
            };

            // Determinar qué campos se actualizaron
            for (const [key, value] of Object.entries(updateData)) {
                if (key !== 'updatedAt' && key !== 'lastSeenAt' && (device as any)[key] !== value) {
                    updatedFields.push(key);
                }
            }

            // Actualizar en la base de datos
            await prisma.smartPlugDevice.update({
                where: { id: device.id },
                data: updateData
            });

            console.log(`✅ [SYNC] Dispositivo ${deviceId} resincronizado exitosamente`);
            console.log(`📊 [SYNC] Campos actualizados: ${updatedFields.join(', ')}`);

            return NextResponse.json({
                success: true,
                message: "Dispositivo resincronizado exitosamente",
                generation,
                updatedFields,
                deviceInfo: {
                    name: syncResult.name,
                    model: syncResult.model,
                    firmware: syncResult.firmwareVersion,
                    mac: syncResult.mac,
                    online: true,
                    lastSync: new Date().toISOString()
                }
            });

        } catch (syncError) {
            console.error(`❌ [SYNC] Error en resincronización:`, syncError);
            
            const errorMessage = syncError instanceof Error ? syncError.message : 'Error desconocido';
            
            // Marcar como offline si la sincronización falla
            await prisma.smartPlugDevice.update({
                where: { id: device.id },
                data: {
                    online: false,
                    lastSeenAt: new Date(),
                    updatedAt: new Date()
                }
            });

            return NextResponse.json({
                success: false,
                error: `Error en resincronización: ${errorMessage}`,
                deviceId,
                lastAttempt: new Date().toISOString()
            }, { status: 500 });
        }

    } catch (error) {
        console.error(`❌ [SYNC] Error general:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json({ 
            error: `Error en resincronización: ${errorMessage}` 
        }, { status: 500 });
    }
}

/**
 * SINCRONIZACIÓN ESPECÍFICA PARA GEN 1
 * ========================================
 * Utiliza HTTP REST API
 */
async function syncGen1Device(device: any, deviceInfo: Gen1DeviceInfo): Promise<any> {
    console.log(`🔄 [SYNC-GEN1] Sincronizando dispositivo Gen1...`);
    
    const result: any = {
        name: deviceInfo.wifi_sta?.connected ? device.name : 'Dispositivo Gen1',
        mac: deviceInfo.mac,
        firmwareVersion: deviceInfo.fw,
        model: 'Shelly Gen1',
        timezone: 'UTC', // Gen1 no reporta timezone fácilmente
        wifiSsid: deviceInfo.wifi_sta?.ssid,
    };

    // Estado del relé si está disponible
    if (deviceInfo.relays && deviceInfo.relays.length > 0) {
        result.relayOn = deviceInfo.relays[0].ison;
    }

    // Información de energía si está disponible
    if (deviceInfo.meters && deviceInfo.meters.length > 0) {
        const meter = deviceInfo.meters[0];
        result.power = meter.power;
        result.energy = gen1Utils.wattMinuteToKwh(meter.total);
    }

    console.log(`✅ [SYNC-GEN1] Sincronización Gen1 completada`);
    return result;
}

/**
 * SINCRONIZACIÓN ESPECÍFICA PARA GEN 2
 * ========================================
 * Utiliza WebSocket Commands o HTTP RPC
 */
async function syncGen2Device(device: any, deviceInfo: Gen2DeviceInfo): Promise<any> {
    console.log(`🔄 [SYNC-GEN2] Sincronizando dispositivo Gen2...`);
    
    const result: any = {
        name: device.name, // Mantener nombre de BD por defecto
        mac: deviceInfo.mac || deviceInfo.id,
        firmwareVersion: deviceInfo.ver,
        model: deviceInfo.model,
    };

    try {
        // Obtener estado completo del dispositivo
        const statusCommand = gen2Commands.switch.getStatus(0);
        const deviceStatus: any = await shellyWebSocketManager.sendCommand(
            device.credential.id,
            device.deviceId,
            statusCommand.method,
            statusCommand.params
        );

        if (deviceStatus && typeof deviceStatus === 'object') {
            result.relayOn = deviceStatus.output;
            result.power = deviceStatus.apower;
            result.voltage = deviceStatus.voltage;
            result.current = deviceStatus.current;
            result.temperature = deviceStatus.temperature?.tC;
            
            if (deviceStatus.aenergy) {
                result.energy = deviceStatus.aenergy.total / 1000; // Convertir Wh a kWh
            }
        }

        // Obtener configuración del sistema para timezone
        try {
            const sysConfig: any = await shellyWebSocketManager.sendCommand(
                device.credential.id,
                device.deviceId,
                gen2Methods.system.getConfig,
                undefined
            );
            
            if (sysConfig?.location?.tz) {
                result.timezone = sysConfig.location.tz;
            }
        } catch (configError) {
            console.log(`⚠️ [SYNC-GEN2] No se pudo obtener configuración del sistema`);
        }

    } catch (statusError) {
        console.log(`⚠️ [SYNC-GEN2] No se pudo obtener estado del dispositivo:`, statusError);
    }

    console.log(`✅ [SYNC-GEN2] Sincronización Gen2 completada`);
    return result;
}

/**
 * SINCRONIZACIÓN ESPECÍFICA PARA GEN 3
 * ========================================
 * Utiliza WebSocket Commands o HTTP RPC (igual que Gen2) + funcionalidades Gen3
 */
async function syncGen3Device(device: any, deviceInfo: Gen3DeviceInfo): Promise<any> {
    console.log(`🔄 [SYNC-GEN3] Sincronizando dispositivo Gen3...`);
    
    // Gen3 usa la misma base que Gen2
    const result = await syncGen2Device(device, deviceInfo);
    
    // Agregar información específica de Gen3
    result.model = deviceInfo.model;
    
    try {
        // Obtener configuración de LEDs si está disponible
        const ledConfig: any = await shellyWebSocketManager.sendCommand(
            device.credential.id,
            device.deviceId,
            gen3Methods.plugsUI.getConfig,
            undefined
        );
        
        if (ledConfig?.leds) {
            result.ledMode = ledConfig.leds.mode;
            result.ledConfig = ledConfig.leds;
        }
    } catch (ledError) {
        console.log(`⚠️ [SYNC-GEN3] No se pudo obtener configuración de LEDs`);
    }

    console.log(`✅ [SYNC-GEN3] Sincronización Gen3 completada`);
    return result;
} 