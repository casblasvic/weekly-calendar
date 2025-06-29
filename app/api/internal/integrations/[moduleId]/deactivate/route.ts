import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

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

        return NextResponse.json({ success: true, integration: updatedIntegration });

    } catch (error) {
        console.error(`Error al desactivar el módulo ${moduleId}:`, error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 