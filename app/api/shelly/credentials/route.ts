import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        // Obtener las clínicas del usuario
        const userClinics = await prisma.userClinicAssignment.findMany({
            where: {
                userId: session.user.id
            },
            select: {
                clinicId: true
            }
        });

        const clinicIds = userClinics.map(uc => uc.clinicId);

        // Obtener credenciales del sistema, incluyendo las del usuario sin clínica asignada
        const credentials = await prisma.shellyCredential.findMany({
            where: {
                systemId: session.user.systemId,
                OR: [
                    { clinicId: { in: clinicIds } },  // Credenciales de clínicas del usuario
                    { clinicId: null }                // Credenciales sin clínica asignada
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                status: true,
                lastSyncAt: true,
                createdAt: true,
                clinic: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 🔌 NUEVO: Obtener estado de WebSocket para cada credencial
        const credentialsWithWebSocketStatus = await Promise.all(
            credentials.map(async (credential) => {
                // Buscar conexión WebSocket para esta credencial (con filtro multi-tenant)
                const webSocketConnection = await prisma.webSocketConnection.findFirst({
                    where: {
                        type: 'SHELLY',
                        referenceId: credential.id,
                        systemId: session.user.systemId // 🛡️ FILTRO MULTI-TENANT
                    },
                    select: {
                        status: true,
                        autoReconnect: true,
                        lastPingAt: true,
                        errorMessage: true
                    }
                });

                return {
                    ...credential,
                    // Estado combinado: credencial + WebSocket
                    webSocketStatus: webSocketConnection?.status || 'disconnected',
                    webSocketAutoReconnect: webSocketConnection?.autoReconnect || false,
                    webSocketLastPing: webSocketConnection?.lastPingAt,
                    webSocketError: webSocketConnection?.errorMessage,
                    // Estado final para mostrar al usuario
                    connectionStatus: getConnectionStatus(credential.status, webSocketConnection?.status),
                    canConnectWebSocket: credential.status === 'connected' && 
                                       (!webSocketConnection || webSocketConnection.status !== 'connected')
                };
            })
        );

        return NextResponse.json(credentialsWithWebSocketStatus);

    } catch (error) {
        console.error('Error al obtener credenciales:', error);
        return NextResponse.json({ 
            error: "Error al obtener las credenciales" 
        }, { status: 500 });
    }
}

/**
 * 🎯 Determinar estado final de conexión para mostrar al usuario
 */
function getConnectionStatus(credentialStatus: string, webSocketStatus?: string): 'connected' | 'disconnected' | 'error' | 'expired' {
    // Si la credencial está expirada o en error, ese es el estado principal
    if (credentialStatus === 'expired') return 'expired';
    if (credentialStatus === 'error') return 'error';
    
    // Si la credencial está conectada, el estado depende del WebSocket
    if (credentialStatus === 'connected') {
        if (!webSocketStatus || webSocketStatus === 'disconnected') {
            return 'disconnected'; // Credencial OK pero WebSocket desconectado
        }
        if (webSocketStatus === 'connected') {
            return 'connected'; // Todo funcionando
        }
        if (webSocketStatus === 'error') {
            return 'error'; // WebSocket con problemas
        }
    }
    
    // Fallback
    return 'disconnected';
} 