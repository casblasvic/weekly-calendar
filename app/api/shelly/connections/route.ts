import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        // Obtener todas las credenciales con su estado de conexión
        const credentials = await prisma.shellyCredential.findMany({
            where: {
                systemId: session.user.systemId
            },
            include: {
                _count: {
                    select: { smartPlugs: true }
                }
            }
        });

        // Obtener estado de conexiones WebSocket (con filtro multi-tenant)
        const wsConnections = await prisma.webSocketConnection.findMany({
            where: {
                type: 'SHELLY',
                systemId: session.user.systemId, // 🛡️ FILTRO MULTI-TENANT
                referenceId: {
                    in: credentials.map(c => c.id)
                }
            }
        });

        // Mapear conexiones con credenciales
        const connectionStatus = credentials.map(credential => {
            const wsConnection = wsConnections.find(ws => ws.referenceId === credential.id);
            
            return {
                id: credential.id,
                credentialName: credential.name,
                status: wsConnection?.status || 'disconnected',
                lastPingAt: wsConnection?.lastPingAt,
                errorMessage: wsConnection?.errorMessage,
                deviceCount: credential._count.smartPlugs
            };
        });

        return NextResponse.json(connectionStatus);

    } catch (error) {
        console.error('Error obteniendo estado de conexiones:', error);
        return NextResponse.json({ 
            error: "Error al obtener estado de conexiones" 
        }, { status: 500 });
    }
} 