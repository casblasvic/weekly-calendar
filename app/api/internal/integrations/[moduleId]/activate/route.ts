import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

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


export async function POST(request: NextRequest, { params }: { params: { moduleId: string } }) {
    const session = await auth();
    const { moduleId } = params;

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

        // Si la integración es Shelly, crear el webhook de sistema asociado
        if (integrationModule.name.includes("Shelly")) {
            const webhookUrlBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            
            // Usamos upsert para evitar crear duplicados si ya existe por alguna razón
            const webhook = await prisma.webhook.upsert({
                where: { integrationId: systemIntegration.id },
                update: { isActive: true },
                create: {
                    ...SHELLY_WEBHOOK_CONFIG,
                    systemId,
                    isSystemWebhook: true,
                    integrationId: systemIntegration.id,
                    token: `wh_sys_shelly_${systemId.slice(-6)}_${Math.random().toString(36).substring(2, 10)}`,
                    // La URL se construye dinámicamente, pero la base se puede guardar
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

        return NextResponse.json({ success: true, integration: systemIntegration });

    } catch (error) {
        console.error(`Error al activar el módulo ${moduleId}:`, error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 