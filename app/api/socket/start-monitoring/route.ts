import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { getSiteUrl } from '@/lib/utils/site-url';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Forzando inicio de monitoreo de dispositivos...');
        
        // Verificar que el servidor Socket.io esté inicializado
        const baseUrl = getSiteUrl();
        await fetch(`${baseUrl}/api/socket`);
        
        // Ejecutar un ciclo de monitoreo inmediatamente
        await executeMonitoringCycle();
        
        return NextResponse.json({ 
            success: true, 
            message: "Monitoreo iniciado correctamente" 
        });
    } catch (error) {
        console.error('Error iniciando monitoreo:', error);
        return NextResponse.json({ 
            error: "Error al iniciar monitoreo" 
        }, { status: 500 });
    }
}

async function executeMonitoringCycle() {
    try {
        console.log('⏰ Ejecutando ciclo de monitoreo manual...');
        
        const credentials = await prisma.shellyCredential.findMany({
            where: { status: 'connected' },
            include: {
                smartPlugs: {
                    where: { excludeFromSync: false }
                }
            }
        });

        console.log(`📋 Encontradas ${credentials.length} credenciales conectadas`);

        for (const credential of credentials) {
            console.log(`🔑 Procesando credencial: ${credential.name} con ${credential.smartPlugs.length} dispositivos`);
            
            for (const device of credential.smartPlugs) {
                try {
                    console.log(`🔌 Verificando dispositivo: ${device.name} (${device.deviceId})`);
                    
                    const response = await fetch(`${credential.apiHost}/device/status?id=${device.deviceId}`, {
                        headers: {
                            'Authorization': `Bearer ${credential.accessToken}`
                        },
                        signal: AbortSignal.timeout(5000)
                    });

                    if (response.ok) {
                        const status = await response.json();
                        console.log(`📊 Estado recibido para ${device.name}:`, {
                            online: status.data?.online,
                            switch0: status.data?.device_status?.['switch:0']?.output,
                            relays: status.data?.device_status?.relays?.[0]?.ison,
                            power: status.data?.device_status?.['switch:0']?.apower
                        });
                        
                        const update = {
                            deviceId: device.id,
                            online: status.data?.online || false,
                            relayOn: status.data?.device_status?.['switch:0']?.output || 
                                    status.data?.device_status?.relays?.[0]?.ison || null,
                            currentPower: status.data?.device_status?.['switch:0']?.apower || 
                                         status.data?.device_status?.meters?.[0]?.power || null,
                            temperature: status.data?.device_status?.temperature || null,
                            timestamp: Date.now()
                        };

                        // Verificar si hay cambios antes de actualizar
                        const hasChanges = 
                            device.online !== update.online ||
                            device.relayOn !== update.relayOn ||
                            Math.abs((device.currentPower || 0) - (update.currentPower || 0)) > 0.1;

                        console.log(`🔄 Dispositivo ${device.name} - Cambios detectados: ${hasChanges}`, {
                            oldOnline: device.online,
                            newOnline: update.online,
                            oldRelayOn: device.relayOn,
                            newRelayOn: update.relayOn,
                            oldPower: device.currentPower,
                            newPower: update.currentPower
                        });

                        // Siempre actualizar la base de datos en el monitoreo manual
                        console.log(`💾 Actualizando BD para ${device.name}`);
                        
                        await prisma.smartPlugDevice.update({
                            where: { id: device.id },
                            data: {
                                online: update.online,
                                relayOn: update.relayOn,
                                currentPower: update.currentPower,
                                temperature: update.temperature,
                                lastSeenAt: new Date()
                            }
                        });

                        // Intentar broadcast via función global
                        if (global.broadcastDeviceUpdate) {
                            console.log(`📤 Enviando update via global broadcast`);
                            global.broadcastDeviceUpdate(credential.systemId, update);
                        } else {
                            console.log(`⚠️ Global broadcast no disponible`);
                        }
                    } else {
                        console.log(`❌ Error HTTP ${response.status} para dispositivo ${device.name}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Error actualizando ${device.name}:`, error instanceof Error ? error.message : 'Error desconocido');
                }
            }
        }
        
        console.log('✅ Ciclo de monitoreo manual completado');
    } catch (error) {
        console.error('❌ Error en monitoreo manual:', error);
        throw error;
    }
} 