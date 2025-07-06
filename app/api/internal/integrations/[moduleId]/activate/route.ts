import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";
import { shellyModuleService, reactivateAllShellyWebSockets } from "@/lib/services/shelly-module-service";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

// Datos de configuración para el webhook de Shelly
const SHELLY_WEBHOOK_CONFIG = {
    name: "System - Shelly Device Ingestion",
    description: "Webhook del sistema para recibir datos de dispositivos Shelly. No eliminar.",
    slug: `system-shelly-ingestion`, // Se le puede añadir un hash único por sistema si es necesario
    direction: "INCOMING",
    allowedMethods: ["GET", "POST"],
    requiresAuth: true,
    authType: 'bearer', // O el que se decida para los de sistema
    dataMapping: {
        targetTable: "AppointmentDeviceUsage",
        fieldMappings: {
            // Aquí irían los mapeos predefinidos para los datos que envía Shelly
            // Por ejemplo:
            "deviceId": { "source": "device_id", "required": true, "transform": "string" },
            "power": { "source": "power", "required": false, "transform": "float" }
            // etc...
        }
    },
    responseConfig: {
        type: 'simple',
        successStatusCode: 200,
    }
};


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

        // Crear o actualizar la entrada de integración para el sistema
        let systemIntegration = await prisma.systemIntegration.findUnique({
            where: { systemId_moduleId: { systemId, moduleId } },
        });
        
        if (systemIntegration) {
            systemIntegration = await prisma.systemIntegration.update({
                where: { id: systemIntegration.id },
                data: { isActive: true },
            });
        } else {
            systemIntegration = await prisma.systemIntegration.create({
                data: { systemId, moduleId, isActive: true, settings: {} },
            });
        }

        // 🔄 INVALIDAR CACHE: Invalidar cache del servicio para este sistema
        if (integrationModule.name.toLowerCase().includes('shelly') && integrationModule.category === 'IOT_DEVICES') {
            shellyModuleService.invalidateCache(systemId);
            console.log(`🗑️ [ACTIVATE] Cache de módulo Shelly invalidado para sistema ${systemId}`);
            
            // 🔄 REACTIVAR CREDENCIALES: Restaurar credenciales suspendidas
            try {
                reactivateAllShellyWebSockets(systemId).catch(error => {
                    console.error('❌ [ACTIVATE] Error en reactivación automática:', error);
                });
                console.log('✅ [ACTIVATE] Reactivación automática de credenciales Shelly iniciada');
            } catch (error) {
                console.error('❌ [ACTIVATE] Error iniciando reactivación automática:', error);
            }
        }

        // Si la integración es Shelly, crear el webhook de sistema asociado
        if (integrationModule.name.includes("Shelly")) {
            const webhookUrlBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            
            // Usamos upsert para evitar crear duplicados si ya existe por alguna razón
            const webhook = await prisma.webhook.upsert({
                where: { integrationId: systemIntegration.id },
                update: { isActive: true },
                create: {
                    name: SHELLY_WEBHOOK_CONFIG.name,
                    description: SHELLY_WEBHOOK_CONFIG.description,
                    slug: SHELLY_WEBHOOK_CONFIG.slug,
                    direction: SHELLY_WEBHOOK_CONFIG.direction,
                    allowedMethods: SHELLY_WEBHOOK_CONFIG.allowedMethods,
                    requiresAuth: SHELLY_WEBHOOK_CONFIG.requiresAuth,
                    dataMapping: SHELLY_WEBHOOK_CONFIG.dataMapping,
                    responseConfig: SHELLY_WEBHOOK_CONFIG.responseConfig,
                    systemId,
                    isSystemWebhook: true,
                    integrationId: systemIntegration.id,
                    token: `wh_sys_shelly_${systemId.slice(-6)}_${Math.random().toString(36).substring(2, 10)}`,
                    url: '' // Se reconstruirá
                }
            });
            
            const finalUrl = `${webhookUrlBase}/api/webhooks/${webhook.id}/${webhook.slug}`;
            const updatedWebhook = await prisma.webhook.update({
                where: { id: webhook.id },
                data: { url: finalUrl }
            });

            // Guardar el ID del webhook en la configuración de la integración
            await prisma.systemIntegration.update({
                where: { id: systemIntegration.id },
                data: { settings: { webhookId: updatedWebhook.id, webhookUrl: updatedWebhook.url } },
            });
        }

        return NextResponse.json({ 
            success: true, 
            integration: systemIntegration,
            // 🔄 Señal para invalidar cache en el frontend
            invalidateCache: true,
            cacheKeys: ['integrations']
        });

    } catch (error) {
        console.error(`Error al activar el módulo ${moduleId}:`, error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 