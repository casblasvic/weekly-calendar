import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/shelly/crypto";
import { refreshShellyToken } from "@/lib/shelly/client";

const prisma = new PrismaClient();

export async function POST(
    request: NextRequest,
    { params }: { params: { credentialId: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { credentialId } = await params;

        // Obtener las credenciales
        const credential = await prisma.shellyCredential.findFirst({
            where: {
                id: credentialId,
                systemId: session.user.systemId
            }
        });

        if (!credential) {
            return NextResponse.json({ 
                error: "Credenciales no encontradas" 
            }, { status: 404 });
        }

        console.log(`🔄 Intentando reconectar credential: ${credential.name}`);

        try {
            // Intentar refrescar el token
            const refreshToken = decrypt(credential.refreshToken);
            const newTokens = await refreshShellyToken(credential.apiHost, refreshToken);
            
            // Actualizar tokens en la base de datos
            await prisma.shellyCredential.update({
                where: { id: credentialId },
                data: {
                    accessToken: encrypt(newTokens.access_token),
                    refreshToken: encrypt(newTokens.refresh_token),
                    status: 'connected',
                    updatedAt: new Date()
                }
            });

            console.log(`✅ Reconexión exitosa para: ${credential.name}`);
            
            return NextResponse.json({ 
                success: true,
                message: "Reconexión exitosa"
            });
            
        } catch (refreshError) {
            console.error('❌ Error al reconectar:', refreshError);
            
            // Marcar como expirado si no se puede refrescar
            await prisma.shellyCredential.update({
                where: { id: credentialId },
                data: { 
                    status: 'expired',
                    updatedAt: new Date()
                }
            });
            
            return NextResponse.json({ 
                error: "No se pudo reconectar. Re-autenticación necesaria." 
            }, { status: 401 });
        }

    } catch (error) {
        console.error('Error en reconexión:', error);
        return NextResponse.json({ 
            error: "Error interno del servidor" 
        }, { status: 500 });
    }
} 