import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/shelly/crypto";
import { refreshShellyToken } from "@/lib/shelly/client";

const prisma = new PrismaClient();

interface ShellyDevice {
    id: string;
    name: string;
    type: string;
    online: boolean;
    status?: {
        'switch:0'?: {
            output: boolean;
        };
    };
}

interface DevicesResponse {
    isok: boolean;
    data?: {
        devices: ShellyDevice[];
    };
}

export async function POST(
    request: NextRequest,
    { params }: { params: { credentialId: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { credentialId } = await params;
        console.log(`🔄 Iniciando sincronización para credential: ${credentialId}`);

        // Obtener las credenciales
        const credential = await prisma.shellyCredential.findFirst({
            where: {
                id: credentialId,
                systemId: session.user.systemId
            }
        });

        if (!credential) {
            console.log(`❌ Credenciales no encontradas para ID: ${credentialId}`);
            return NextResponse.json({ 
                error: "Credenciales no encontradas" 
            }, { status: 404 });
        }

        console.log(`✅ Credenciales encontradas: ${credential.name} (${credential.email})`);

        // Descifrar el access token
        let accessToken: string;
        try {
            accessToken = decrypt(credential.accessToken);
        } catch (error) {
            console.error('Error al descifrar token:', error);
            // Token corrupto o expirado
            await prisma.shellyCredential.update({
                where: { id: credentialId },
                data: { status: 'error' }
            });
            return NextResponse.json({ 
                error: "Token corrupto, re-autenticación necesaria" 
            }, { status: 401 });
        }

        // Obtener dispositivos de Shelly
        console.log(`🔍 Obteniendo dispositivos de: ${credential.apiHost}/device/all_status?show_info=true`);
        const devicesResponse = await fetch(`${credential.apiHost}/device/all_status?show_info=true`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log(`📡 Respuesta de Shelly: ${devicesResponse.status}`);

        if (devicesResponse.status === 401) {
            // Token expirado, intentar refrescar
            console.log('Token expirado, intentando refrescar...');
            
            try {
                const refreshToken = decrypt(credential.refreshToken);
                const newTokens = await refreshShellyToken(credential.apiHost, refreshToken);
                
                // Actualizar tokens en la base de datos
                await prisma.shellyCredential.update({
                    where: { id: credentialId },
                    data: {
                        accessToken: encrypt(newTokens.access_token),
                        refreshToken: encrypt(newTokens.refresh_token),
                        status: 'connected'
                    }
                });
                
                // Reintentar con el nuevo token
                accessToken = newTokens.access_token;
                const retryResponse = await fetch(`${credential.apiHost}/device/all_status?show_info=true`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                
                if (!retryResponse.ok) {
                    throw new Error('Error al obtener dispositivos después de refrescar token');
                }
                
                const retryData = await retryResponse.json();
                await processDevices(retryData, credential);
                await markMissingDevices(retryData, credential);
                
            } catch (refreshError) {
                // Error al refrescar, marcar como expirado
                await prisma.shellyCredential.update({
                    where: { id: credentialId },
                    data: { status: 'expired' }
                });
                
                return NextResponse.json({ 
                    error: "Token expirado, re-autenticación necesaria" 
                }, { status: 401 });
            }
        } else if (devicesResponse.ok) {
            const data = await devicesResponse.json();
            
            // 🔍 LOG COMPLETO para debugging
            console.log('📋 DATOS COMPLETOS RECIBIDOS DE SHELLY:');
            console.log(JSON.stringify(data, null, 2));
            
            await processDevices(data, credential);
            
            // Marcar dispositivos que ya no están en Shelly como "missing"
            await markMissingDevices(data, credential);
        } else {
            throw new Error(`Error al obtener dispositivos: ${devicesResponse.status}`);
        }

        // Actualizar última sincronización
        await prisma.shellyCredential.update({
            where: { id: credentialId },
            data: { 
                lastSyncAt: new Date(),
                status: 'connected'
            }
        });

        return NextResponse.json({ 
            success: true,
            message: "Dispositivos sincronizados exitosamente"
        });

    } catch (error) {
        console.error('Error al sincronizar:', error);
        return NextResponse.json({ 
            error: "Error al sincronizar dispositivos" 
        }, { status: 500 });
    }
}

async function processDevices(data: any, credential: any) {
    console.log(`📱 Procesando dispositivos de Shelly (formato real)`);
    
    if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inválida de Shelly - no es un objeto');
    }

    // 🔍 Detectar formato de respuesta y extraer dispositivos
    let devicesData: any;
    
    if (data.isok && data.data && data.data.devices_status) {
        // Formato /device/all_status: { isok: true, data: { devices_status: {...} } }
        console.log(`📋 Formato detectado: all_status (anidado)`);
        devicesData = data.data.devices_status;
    } else if (typeof data === 'object' && !data.isok) {
        // Formato /device/status: { "deviceId": {...}, "deviceId2": {...} }
        console.log(`📋 Formato detectado: status (directo)`);
        devicesData = data;
    } else {
        throw new Error('Formato de respuesta de Shelly no reconocido');
    }

    const deviceEntries = Object.entries(devicesData);
    console.log(`🔌 Encontrados ${deviceEntries.length} dispositivos en total`);

    // ✅ REGISTRAR TODOS LOS DISPOSITIVOS - el usuario decidirá qué eliminar
    const relevantDevices = deviceEntries.filter(([deviceId, deviceData]: [string, any]) => {
        const devInfo = deviceData._dev_info;
        
        // Si no hay _dev_info, no es un dispositivo válido de Shelly
        if (!devInfo || !devInfo.code) {
            console.log(`⚠️ Dispositivo ${deviceId} sin _dev_info válido - OMITIDO`);
            return false;
        }
        
        // ✅ REGISTRAR TODOS los dispositivos válidos de Shelly
        console.log(`✅ Dispositivo Shelly válido: ${deviceId} (${devInfo.code}) - Gen: ${devInfo.gen}`);
        return true;
    });

    console.log(`✅ Dispositivos Shelly válidos: ${relevantDevices.length}`);

    // Procesar cada dispositivo
    for (const [deviceId, deviceData] of relevantDevices) {
        try {
            await processIndividualDevice(deviceId, deviceData as any, credential);
        } catch (error) {
            console.error(`❌ Error procesando dispositivo ${deviceId}:`, error);
        }
    }
}

async function processIndividualDevice(deviceId: string, deviceData: any, credential: any) {
    const devInfo = deviceData._dev_info;
    console.log(`🔍 Procesando: ${deviceId} (${devInfo.code}) - Gen: ${devInfo.gen}`);

    // Verificar si el dispositivo está excluido de sincronización
    const existingDevice = await prisma.smartPlugDevice.findFirst({
        where: {
            deviceId: deviceId,
            credentialId: credential.id
        }
    });

    if (existingDevice?.excludeFromSync) {
        console.log(`⏭️ Dispositivo excluido de sync: ${existingDevice.name} (${deviceId})`);
        return; // Saltar este dispositivo
    }

    // Extraer datos básicos
    const basicData = extractBasicDeviceData(deviceData);
    
    // Extraer datos energéticos
    const energyData = extractEnergyData(deviceData);
    
    // Extraer datos de conectividad
    const connectivityData = extractConnectivityData(deviceData);
    
    // Extraer estado del relay/switch
    const relayData = extractRelayData(deviceData);

    const deviceUpdateData = {
        name: basicData.name || `Shelly ${devInfo.code}`,
        type: 'SHELLY',
        deviceIp: connectivityData.ip,
        generation: devInfo.gen,
        modelCode: devInfo.code,
        macAddress: basicData.mac,
        firmwareVersion: basicData.firmware,
        hasUpdate: basicData.hasUpdate,
        online: devInfo.online,
        lastSeenAt: devInfo.online ? new Date() : undefined,
        // Si el dispositivo está offline, el relay debe aparecer como apagado independientemente del estado real
        relayOn: devInfo.online ? relayData.output : false,
        relaySource: relayData.source,
        currentPower: energyData.power,
        totalEnergy: energyData.total,
        voltage: energyData.voltage,
        current: energyData.current,
        wifiSsid: connectivityData.ssid,
        wifiRssi: connectivityData.rssi,
        temperature: basicData.temperature,
        credentialId: credential.id,
        systemId: credential.systemId,
        clinicId: credential.clinicId,
        rawData: deviceData, // Guardar datos completos para debugging
        updatedAt: new Date()
    };

    if (existingDevice) {
        console.log(`🔄 Actualizando dispositivo: ${basicData.name || deviceId}`);
        await prisma.smartPlugDevice.update({
            where: { id: existingDevice.id },
            data: deviceUpdateData
        });
    } else {
        console.log(`🆕 Creando nuevo dispositivo: ${basicData.name || deviceId}`);
        
        // Buscar o crear integración de Shelly para este sistema
        let integration = await prisma.systemIntegration.findFirst({
            where: {
                systemId: credential.systemId,
                module: {
                    name: 'Shelly'
                }
            }
        });

        if (!integration) {
            // Crear integración si no existe
            const shellyModule = await prisma.integrationModule.findFirst({
                where: { name: 'Shelly' }
            });

            if (shellyModule) {
                integration = await prisma.systemIntegration.create({
                    data: {
                        systemId: credential.systemId,
                        moduleId: shellyModule.id,
                        isActive: true
                    }
                });
            } else {
                console.error('❌ Módulo Shelly no encontrado');
                return;
            }
        }

        await prisma.smartPlugDevice.create({
            data: {
                deviceId,
                integrationId: integration.id,
                ...deviceUpdateData
            }
        });
    }
}

// Funciones helper para extraer datos específicos
function extractBasicDeviceData(data: any) {
    return {
        name: data.name || null,
        mac: data.mac || data.sys?.mac || null,
        firmware: data.sys?.fw_info?.fw || data.getinfo?.fw_info?.fw || null,
        hasUpdate: data.has_update || data.sys?.available_updates ? true : false,
        temperature: data.temperature || data.tmp?.tC || data.switch?.['0']?.temperature?.tC || null
    };
}

function extractEnergyData(data: any) {
    // G2 devices (switch:0)
    if (data['switch:0']) {
        return {
            power: data['switch:0'].apower || null,
            total: data['switch:0'].aenergy?.total || null,
            voltage: data['switch:0'].voltage || null,
            current: data['switch:0'].current || null
        };
    }
    
    // G1 devices (meters array)
    if (data.meters && data.meters[0]) {
        return {
            power: data.meters[0].power || null,
            total: data.meters[0].total || null,
            voltage: data.voltage || null,
            current: null
        };
    }
    
    return { power: null, total: null, voltage: null, current: null };
}

function extractConnectivityData(data: any) {
    // G2 devices
    if (data.wifi) {
        return {
            ip: data.wifi.sta_ip || null,
            ssid: data.wifi.ssid || null,
            rssi: data.wifi.rssi || null
        };
    }
    
    // G1 devices
    if (data.wifi_sta) {
        return {
            ip: data.wifi_sta.ip || null,
            ssid: data.wifi_sta.ssid || null,
            rssi: data.wifi_sta.rssi || null
        };
    }
    
    return { ip: null, ssid: null, rssi: null };
}

function extractRelayData(data: any) {
    // G2 devices (switch:0)
    if (data['switch:0']) {
        return {
            output: data['switch:0'].output || false,
            source: data['switch:0'].source || null
        };
    }
    
    // G1 devices (relays array)
    if (data.relays && data.relays[0]) {
        return {
            output: data.relays[0].ison || false,
            source: data.relays[0].source || null
        };
    }
    
    // Cover devices
    if (data['cover:0']) {
        return {
            output: data['cover:0'].state === 'open',
            source: data['cover:0'].source || null
        };
    }
    
    return { output: null, source: null };
}

async function markMissingDevices(data: any, credential: any) {
    console.log(`🔍 Verificando dispositivos desaparecidos...`);
    
    // Obtener todos los dispositivos existentes para esta credencial
    const existingDevices = await prisma.smartPlugDevice.findMany({
        where: {
            credentialId: credential.id
        }
    });

    // 🔍 Extraer IDs de dispositivos según el formato de respuesta
    let currentShellyDeviceIds: string[];
    
    if (data.isok && data.data && data.data.devices_status) {
        // Formato /device/all_status
        currentShellyDeviceIds = Object.keys(data.data.devices_status);
    } else if (typeof data === 'object' && !data.isok) {
        // Formato /device/status
        currentShellyDeviceIds = Object.keys(data);
    } else {
        console.error('❌ Formato de datos no reconocido para verificar dispositivos desaparecidos');
        return;
    }
    
    // Encontrar dispositivos que ya no están en Shelly
    const missingDevices = existingDevices.filter(device => 
        !currentShellyDeviceIds.includes(device.deviceId)
    );

    if (missingDevices.length > 0) {
        console.log(`⚠️ Encontrados ${missingDevices.length} dispositivos desaparecidos`);
        
        // Marcar como missing y offline
        for (const device of missingDevices) {
            await prisma.smartPlugDevice.update({
                where: { id: device.id },
                data: {
                    online: false,
                    // Agregar campo para marcar como missing en el rawData
                    rawData: {
                        ...((device.rawData as any) || {}),
                        _missing: true,
                        _missingDetectedAt: new Date().toISOString()
                    },
                    updatedAt: new Date()
                }
            });
            
            console.log(`⚠️ Dispositivo marcado como desaparecido: ${device.name} (${device.deviceId})`);
        }
    } else {
        console.log(`✅ Todos los dispositivos están presentes en Shelly`);
    }
} 