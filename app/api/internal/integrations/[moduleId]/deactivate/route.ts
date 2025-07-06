import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";
import { disconnectAllShellyWebSockets, shellyModuleService } from "@/lib/services/shelly-module-service";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

export async function POST(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
    const session = await auth();
    const { moduleId } = await params;

    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { systemId } = session.user;

    try {
        const integrationModule = await prisma.integrationModule.findUnique({ where: { id: moduleId } });
        if (!integrationModule) {
            return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
        }

        // Buscar la integración del sistema
        const systemIntegration = await prisma.systemIntegration.findUnique({
            where: { systemId_moduleId: { systemId, moduleId } },
        });

        if (!systemIntegration) {
            return NextResponse.json({ error: "Integración no encontrada" }, { status: 404 });
        }

        // Desactivar la integración
        const updatedIntegration = await prisma.systemIntegration.update({
            where: { id: systemIntegration.id },
            data: { isActive: false },
        });

        // 🔄 INVALIDAR CACHE: Invalidar cache del servicio para este sistema
        if (integrationModule.name.toLowerCase().includes('shelly') && integrationModule.category === 'IOT_DEVICES') {
            shellyModuleService.invalidateCache(systemId);
            console.log(`🗑️ [DEACTIVATE] Cache de módulo Shelly invalidado para sistema ${systemId}`);
        }

        // 🔌 TRIGGER AUTOMÁTICO: Si es módulo Shelly, desconectar WebSockets inmediatamente
        if (integrationModule.name.toLowerCase().includes('shelly') && integrationModule.category === 'IOT_DEVICES') {
            console.log(`🔌 [DEACTIVATE] Módulo Shelly desactivado para sistema ${systemId} - Desconectando WebSockets automáticamente`);
            
            try {
                // Desconectar todas las conexiones Shelly de forma asíncrona
                // No esperamos para no bloquear la respuesta
                disconnectAllShellyWebSockets(systemId).catch(error => {
                    console.error('❌ [DEACTIVATE] Error en desconexión automática:', error);
                });
                
                console.log('✅ [DEACTIVATE] Desconexión automática de WebSockets Shelly iniciada');
            } catch (error) {
                console.error('❌ [DEACTIVATE] Error iniciando desconexión automática:', error);
            }
        }

        return NextResponse.json({ 
            success: true, 
            integration: updatedIntegration,
            // 🔄 Señal para invalidar cache en el frontend
            invalidateCache: true,
            cacheKeys: ['integrations']
        });

    } catch (error) {
        console.error(`Error al desactivar el módulo ${moduleId}:`, error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 