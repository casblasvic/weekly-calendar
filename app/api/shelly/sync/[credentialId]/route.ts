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
    { params }: { params: Promise<{ credentialId: string }> }
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

        // 🔐 VERIFICAR MÓDULO SHELLY ACTIVO ANTES DE PROCESAR
        console.log(`🔍 Verificando si el módulo Shelly está activo...`);
        const activeIntegration = await prisma.systemIntegration.findFirst({
            where: {
                systemId: session.user.systemId,
                isActive: true,
                module: {
                    name: {
                        contains: 'Shelly',
                        mode: 'insensitive'
                    }
                }
            }
        });

        if (!activeIntegration) {
            // Verificar si existe pero está inactivo
            const inactiveIntegration = await prisma.systemIntegration.findFirst({
                where: {
                    systemId: session.user.systemId,
                    isActive: false,
                    module: {
                        name: {
                            contains: 'Shelly',
                            mode: 'insensitive'
                        }
                    }
                }
            });
            
            if (inactiveIntegration) {
                console.error('❌ Módulo Shelly encontrado pero está DESACTIVADO. Actívalo desde el marketplace de integraciones.');
                return NextResponse.json({ 
                    error: "El módulo Shelly está desactivado. Actívalo desde el marketplace de integraciones para sincronizar dispositivos." 
                }, { status: 400 });
            } else {
                console.error('❌ Módulo Shelly no encontrado.');
                return NextResponse.json({ 
                    error: "El módulo Shelly no está instalado. Instálalo desde el marketplace de integraciones." 
                }, { status: 400 });
            }
        }

        console.log(`✅ Módulo Shelly activo encontrado (ID: ${activeIntegration.id})`);

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
        console.log(`🔍 Obteniendo lista de dispositivos de: ${credential.apiHost}/interface/device/list`);
        const devicesResponse = await fetch(`${credential.apiHost}/interface/device/list`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
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
                const retryResponse = await fetch(`${credential.apiHost}/interface/device/list`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!retryResponse.ok) {
                    throw new Error('Error al obtener dispositivos después de refrescar token');
                }
                
                const retryData = await retryResponse.json();
                
                // 🚀 FASE 1: Sincronización básica (retry)
                await processDeviceList(retryData, credential, accessToken, activeIntegration);
                
                // 🚀 FASE 2: Completar datos detallados (retry)
                console.log('🔄 Iniciando FASE 2: Completando datos detallados (retry)...');
                await completeDeviceDetails(retryData, credential, accessToken);
                
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
            
            // 🚀 FASE 1: Sincronización básica (mantener actual)
            await processDeviceList(data, credential, accessToken, activeIntegration);
            
            // 🚀 FASE 2: Completar datos detallados
            console.log('🔄 Iniciando FASE 2: Completando datos detallados...');
            await completeDeviceDetails(data, credential, accessToken);
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

async function processDeviceList(data: any, credential: any, accessToken: string, activeIntegration: any) {
    console.log(`📱 Procesando lista de dispositivos de Shelly`);
    
    if (!data || !data.data || !data.data.devices) {
        throw new Error('Respuesta inválida de Shelly - formato inesperado');
    }

    const devices = data.data.devices;
    const deviceIds = Object.keys(devices);
    console.log(`🔌 Encontrados ${deviceIds.length} dispositivos en total`);

    // Procesar cada dispositivo con información básica disponible
    for (const deviceId of deviceIds) {
        const deviceInfo = devices[deviceId];
        console.log(`🔍 Procesando: ${deviceInfo.name} (${deviceId}) - Tipo: ${deviceInfo.category}`);
        
        try {
            // Crear datos simulados para compatibilidad con processIndividualDevice
            const deviceData = {
                _device_info: deviceInfo,
                _dev_info: {
                    code: deviceInfo.type,
                    gen: deviceInfo.gen,
                    online: deviceInfo.cloud_online !== false
                }
            };

            await processIndividualDevice(deviceId, deviceData, credential, activeIntegration);
        } catch (error) {
            console.error(`❌ Error procesando dispositivo ${deviceId}:`, error);
            // Continuar con el siguiente dispositivo en lugar de fallar completamente
        }
    }

    // Marcar dispositivos que ya no están en Shelly
    await markMissingDevices(deviceIds, credential);
}

async function processDevices(data: any, credential: any, activeIntegration: any) {
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
            await processIndividualDevice(deviceId, deviceData as any, credential, activeIntegration);
        } catch (error) {
            console.error(`❌ Error procesando dispositivo ${deviceId}:`, error);
        }
    }
}

async function processIndividualDevice(deviceId: string, deviceData: any, credential: any, activeIntegration: any) {
    const devInfo = deviceData._dev_info;
    const deviceInfo = deviceData._device_info;
    console.log(`🔍 Procesando: ${deviceId} (${devInfo.code}) - Gen: ${devInfo.gen}`);

    // Verificar si el dispositivo está excluido de sincronización
    const existingDevice = await prisma.smartPlugDevice.findFirst({
        where: {
            deviceId: deviceId,
            credentialId: credential.id
        }
    });

    if (existingDevice) {
        console.log(`📌 Dispositivo YA EXISTE: ${existingDevice.name} (${deviceId})`);
        if (existingDevice.excludeFromSync) {
            console.log(`⏭️ Dispositivo excluido de sync: ${existingDevice.name} (${deviceId})`);
            return; // Saltar este dispositivo
        }
    } else {
        console.log(`✨ Dispositivo NUEVO: ${deviceInfo?.name || deviceId}`);
    }

    // Mostrar información del dispositivo
    const deviceCategory = deviceInfo?.category || 'unknown';
    console.log(`📦 Tipo de dispositivo: ${deviceCategory} - ${devInfo.code}`);

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
        cloudId: deviceId,
        generation: String(devInfo.gen),
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
        
        // Usar la integración ya verificada
        await prisma.smartPlugDevice.create({
            data: {
                deviceId,
                integrationId: activeIntegration.id,
                ...deviceUpdateData
            }
        });
    }
}

// Funciones helper para extraer datos específicos
function extractBasicDeviceData(data: any) {
    // Priorizar el nombre desde _device_info si existe
    const deviceName = data._device_info?.name || data.name || null;
    
    return {
        name: deviceName,
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
    // Usar datos de _device_info si están disponibles
    if (data._device_info) {
        return {
            ip: data._device_info.ip || null,
            ssid: data._device_info.ssid || null,
            rssi: null
        };
    }

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
    
    // Si no hay datos de estado, usar false por defecto
    return { output: false, source: null };
}

async function markMissingDevices(currentShellyDeviceIds: string[], credential: any) {
    console.log(`🔍 Verificando dispositivos desaparecidos...`);
    
    // Obtener todos los dispositivos existentes para esta credencial
    const existingDevices = await prisma.smartPlugDevice.findMany({
        where: {
            credentialId: credential.id
        }
    });
    
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

async function completeDeviceDetails(data: any, credential: any, accessToken: string) {
    console.log('🔍 FASE 2: Obteniendo configuración detallada de dispositivos...');
    
    if (!data || !data.data || !data.data.devices) {
        console.log('⚠️ No hay dispositivos para completar datos detallados');
        return;
    }

    const devices = data.data.devices;
    const deviceIds = Object.keys(devices);
    
    if (deviceIds.length === 0) {
        console.log('⚠️ No hay dispositivos para procesar en FASE 2');
        return;
    }

    console.log(`📱 Completando datos detallados para ${deviceIds.length} dispositivos...`);

    try {
        // 🚀 PROCESAR EN LOTES DE MÁXIMO 10 DISPOSITIVOS (límite de la API)
        const BATCH_SIZE = 10;
        const batches = [];
        
        for (let i = 0; i < deviceIds.length; i += BATCH_SIZE) {
            batches.push(deviceIds.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`📦 Procesando ${batches.length} lotes de dispositivos (máx ${BATCH_SIZE} por lote)`);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`🔄 Procesando lote ${batchIndex + 1}/${batches.length} con ${batch.length} dispositivos`);
            
            // 🚀 LLAMADA POR LOTES para obtener configuración detallada
            const detailsResponse = await fetch(`${credential.apiHost}/v2/devices/api/get`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ids: batch,
                    select: ["settings", "status"]
                })
            });

            if (!detailsResponse.ok) {
                console.log(`⚠️ Error en lote ${batchIndex + 1} (${detailsResponse.status}): No se pudo obtener configuración detallada`);
                // Continuar con el siguiente lote
                continue;
            }

            const detailsData = await detailsResponse.json();
            console.log(`📋 DATOS DETALLADOS RECIBIDOS para lote ${batchIndex + 1}:`);
            console.log(JSON.stringify(detailsData, null, 2));

            if (!detailsData || !Array.isArray(detailsData)) {
                console.log(`⚠️ Respuesta de lote ${batchIndex + 1} sin datos válidos (esperaba array)`);
                continue;
            }

            // 🔄 Procesar cada dispositivo del lote con datos detallados
            for (const deviceDetails of detailsData) {
                const deviceId = deviceDetails.id;
                
                if (!deviceDetails || !deviceId) {
                    console.log(`⚠️ Sin datos detallados válidos para dispositivo`);
                    continue;
                }

                try {
                    await updateDeviceWithDetailedData(deviceId, deviceDetails, credential);
                } catch (error) {
                    console.error(`❌ Error actualizando datos detallados para ${deviceId}:`, error);
                    // Continuar con el siguiente dispositivo
                }
            }
        }

        console.log('✅ FASE 2 completada exitosamente');

    } catch (error) {
        console.error('❌ Error en FASE 2:', error);
        // No fallar la sincronización principal por error en FASE 2
    }
}

async function updateDeviceWithDetailedData(deviceId: string, deviceDetails: any, credential: any) {
    console.log(`🔍 Actualizando datos detallados para: ${deviceId}`);

    // Buscar el dispositivo existente
    const existingDevice = await prisma.smartPlugDevice.findFirst({
        where: {
            deviceId: deviceId,
            credentialId: credential.id
        }
    });

    if (!existingDevice) {
        console.log(`⚠️ Dispositivo ${deviceId} no encontrado en BD para actualizar datos detallados`);
        return;
    }

    // Extraer datos detallados
    const detailedData = extractDetailedDeviceData(deviceDetails);
    
    // Actualizar solo los campos detallados
    await prisma.smartPlugDevice.update({
        where: { id: existingDevice.id },
        data: {
            // Configuración básica
            timezone: detailedData.timezone,
            autoUpdate: detailedData.autoUpdate,
            
            // Configuración de red
            wifiBackupEnabled: detailedData.wifiBackupEnabled,
            wifiBackupSsid: detailedData.wifiBackupSsid,
            apModeEnabled: detailedData.apModeEnabled,
            
            // Configuración de protección
            autoOffEnabled: detailedData.autoOffEnabled,
            autoOffDelay: detailedData.autoOffDelay,
            powerLimit: detailedData.powerLimit,
            
            // Configuración LED (Gen 3)
            ledBrightness: detailedData.ledBrightness,
            ledColorMode: detailedData.ledColorMode,
            ledColorR: detailedData.ledColorR,
            ledColorG: detailedData.ledColorG,
            ledColorB: detailedData.ledColorB,
            ledNightMode: detailedData.ledNightMode,
            
            // Datos energéticos detallados (si están disponibles)
            currentPower: detailedData.currentPower ?? existingDevice.currentPower,
            totalEnergy: detailedData.totalEnergy ?? existingDevice.totalEnergy,
            voltage: detailedData.voltage ?? existingDevice.voltage,
            current: detailedData.current ?? existingDevice.current,
            temperature: detailedData.temperature ?? existingDevice.temperature,
            
            // Estado del relay detallado
            relayOn: detailedData.relayOn ?? existingDevice.relayOn,
            relaySource: detailedData.relaySource ?? existingDevice.relaySource,
            
            // Guardar datos completos detallados
            rawData: {
                ...((existingDevice.rawData as any) || {}),
                _detailedData: deviceDetails,
                _phase2UpdatedAt: new Date().toISOString()
            },
            
            updatedAt: new Date()
        }
    });

    console.log(`✅ Datos detallados actualizados para: ${existingDevice.name} (${deviceId})`);
}

function extractDetailedDeviceData(deviceDetails: any) {
    const settings = deviceDetails.settings || {};
    const status = deviceDetails.status || {};
    
    // Extraer configuración del sistema
    const sys = settings.sys || {};
    const device = sys.device || {};
    const location = sys.location || {};
    const sntp = sys.sntp || {};
    
    // Extraer configuración WiFi
    const wifi = settings.wifi || {};
    const ap = wifi.ap || {};
    
    // Extraer configuración del switch
    const switch0 = settings['switch:0'] || {};
    const switchStatus = status['switch:0'] || {};
    
    // Extraer configuración LED (Gen 3)
    const plugsUi = settings['plugs_ui:0'] || {};
    const leds = plugsUi.leds || {};
    
    // Extraer datos energéticos del status
    const energyStatus = switchStatus.aenergy || {};
    
    return {
        // Configuración básica
        timezone: location.tz || null,
        autoUpdate: sys.auto_update !== false, // Default true si no está definido
        
        // Configuración de red
        wifiBackupEnabled: false, // Requiere análisis más profundo de la config WiFi
        wifiBackupSsid: null,     // Requiere análisis de redes guardadas
        apModeEnabled: ap.enable || false,
        
        // Configuración de protección
        autoOffEnabled: switch0.auto_off_delay !== undefined,
        autoOffDelay: switch0.auto_off_delay || null,
        powerLimit: switch0.power_limit || null,
        
        // Configuración LED (Gen 3)
        ledBrightness: leds.brightness !== undefined ? leds.brightness : null,
        ledColorMode: leds.mode || null,
                 ledColorR: leds.colors?.red !== undefined ? leds.colors.red : null,
         ledColorG: leds.colors?.green !== undefined ? leds.colors.green : null,
         ledColorB: leds.colors?.blue !== undefined ? leds.colors.blue : null,
        ledNightMode: leds.night_mode?.enable || false,
        
        // Datos energéticos detallados del status
        currentPower: switchStatus.apower || null,
        totalEnergy: energyStatus.total || null,
        voltage: switchStatus.voltage || null,
        current: switchStatus.current || null,
        temperature: status.temperature?.tC || switchStatus.temperature?.tC || null,
        
        // Estado del relay detallado
        relayOn: switchStatus.output || false,
        relaySource: switchStatus.source || null
    };
} 