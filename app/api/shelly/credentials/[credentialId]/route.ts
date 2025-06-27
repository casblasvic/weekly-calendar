import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function DELETE(
    request: NextRequest,
    { params }: { params: { credentialId: string } }
) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { credentialId } = await params;

        // Verificar que las credenciales existen y pertenecen al usuario
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

        console.log(`🗑️ Eliminando credential: ${credential.name} y dispositivos asociados`);

        // Usar transacción para eliminar todo en cascada
        await prisma.$transaction(async (tx) => {
            // 1. Eliminar todos los dispositivos asociados a esta credencial
            const deletedDevices = await tx.smartPlugDevice.deleteMany({
                where: {
                    credentialId: credentialId
                }
            });

            console.log(`🔌 Eliminados ${deletedDevices.count} dispositivos`);

            // 2. Eliminar las credenciales
            await tx.shellyCredential.delete({
                where: {
                    id: credentialId
                }
            });

            console.log(`✅ Credential ${credential.name} eliminada exitosamente`);
        });

        return NextResponse.json({ 
            success: true,
            message: "Cuenta y dispositivos eliminados exitosamente"
        });

    } catch (error) {
        console.error('Error eliminando credenciales:', error);
        return NextResponse.json({ 
            error: "Error al eliminar la cuenta" 
        }, { status: 500 });
    }
} 