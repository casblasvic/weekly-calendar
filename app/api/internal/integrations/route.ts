import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { systemId } = session.user;

    try {
        const availableModules = await prisma.integrationModule.findMany({
            orderBy: {
                category: 'asc',
            }
        });

        const systemIntegrations = await prisma.systemIntegration.findMany({
            where: { systemId },
            select: {
                moduleId: true,
                isActive: true,
            }
        });
        
        const integrationsMap = new Map(
            systemIntegrations.map(si => [si.moduleId, { isActive: si.isActive }])
        );

        const modulesWithStatus = availableModules.map(module => ({
            ...module,
            ...integrationsMap.get(module.id) || { isActive: false },
        }));

        // Agrupar por categoría
        const groupedByCategory = modulesWithStatus.reduce((acc, module) => {
            const { category } = module;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(module);
            return acc;
        }, {} as Record<string, typeof modulesWithStatus>);
        
        return NextResponse.json(groupedByCategory);

    } catch (error) {
        console.error("Error fetching integrations:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 