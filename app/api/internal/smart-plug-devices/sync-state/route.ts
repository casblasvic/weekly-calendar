import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

interface DeviceState {
    id: string;
    name: string;
    currentState: {
        online: boolean;
        relayOn: boolean;
        currentPower?: number;
        voltage?: number;
        temperature?: number;
    };
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    
    try {
        const { devices }: { devices: DeviceState[] } = await request.json();
        
        if (!Array.isArray(devices) || devices.length === 0) {
            return NextResponse.json({ error: "Se requiere un array de devices" }, { status: 400 });
        }

        // 1. Obtener estados actuales de la BD
        const deviceIds = devices.map(d => d.id);
        const currentDBStates = await prisma.smartPlugDevice.findMany({
            where: {
                id: { in: deviceIds },
                systemId: session.user.systemId
            },
            select: {
                id: true,
                name: true,
                online: true,
                relayOn: true,
                currentPower: true,
                voltage: true,
                temperature: true
            }
        });

        // 2. Comparar estados y encontrar diferencias
        const devicesToUpdate: { id: string; data: any; changes: string[] }[] = [];
        
        devices.forEach(device => {
            const dbState = currentDBStates.find(db => db.id === device.id);
            if (!dbState) return; // Dispositivo no encontrado en BD
            
            const changes: string[] = [];
            const updateData: any = {};
            
            // Comparar cada campo y detectar diferencias
            if (Boolean(dbState.online) !== Boolean(device.currentState.online)) {
                changes.push(`online: ${dbState.online} → ${device.currentState.online}`);
                updateData.online = device.currentState.online;
            }
            
            if (Boolean(dbState.relayOn) !== Boolean(device.currentState.relayOn)) {
                changes.push(`relayOn: ${dbState.relayOn} → ${device.currentState.relayOn}`);
                updateData.relayOn = device.currentState.relayOn;
            }
            
            if (Number(dbState.currentPower || 0) !== Number(device.currentState.currentPower || 0)) {
                changes.push(`currentPower: ${dbState.currentPower} → ${device.currentState.currentPower}`);
                updateData.currentPower = device.currentState.currentPower || 0;
            }
            
            if (device.currentState.voltage !== undefined && Number(dbState.voltage || 0) !== Number(device.currentState.voltage)) {
                changes.push(`voltage: ${dbState.voltage} → ${device.currentState.voltage}`);
                updateData.voltage = device.currentState.voltage;
            }
            
            if (device.currentState.temperature !== undefined && Number(dbState.temperature || 0) !== Number(device.currentState.temperature)) {
                changes.push(`temperature: ${dbState.temperature} → ${device.currentState.temperature}`);
                updateData.temperature = device.currentState.temperature;
            }
            
            // Solo agregar si hay cambios reales
            if (changes.length > 0) {
                updateData.updatedAt = new Date();
                devicesToUpdate.push({
                    id: device.id,
                    data: updateData,
                    changes
                });
            }
        });

        // 3. Actualizar solo los dispositivos con diferencias
        let updatedCount = 0;
        if (devicesToUpdate.length > 0) {
            console.log(`🔍 [BD SYNC] Detectadas diferencias en ${devicesToUpdate.length} dispositivos:`);
            
            for (const deviceUpdate of devicesToUpdate) {
                const dbDevice = currentDBStates.find(db => db.id === deviceUpdate.id);
                console.log(`  📝 ${dbDevice?.name}: ${deviceUpdate.changes.join(', ')}`);
                
                await prisma.smartPlugDevice.update({
                    where: { id: deviceUpdate.id },
                    data: deviceUpdate.data
                });
                updatedCount++;
            }
        }

        const skippedCount = devices.length - updatedCount;
        
        console.log(`✅ [BD SYNC] Sincronización completada: ${updatedCount} actualizados, ${skippedCount} sin cambios`);

        return NextResponse.json({ 
            success: true, 
            updatedCount,
            skippedCount,
            totalChecked: devices.length,
            message: `${updatedCount} dispositivos actualizados, ${skippedCount} sin cambios`
        });

    } catch (error) {
        console.error("Error syncing device states:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 