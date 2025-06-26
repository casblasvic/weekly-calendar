import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Se requiere un array de IDs" }, { status: 400 });
        }

        // Verificación de seguridad: Asegurarse de que todos los logs a eliminar
        // pertenezcan al sistema del usuario autenticado.
        const logsToDelete = await prisma.webhookLog.findMany({
            where: {
                id: { in: ids },
                systemId: session.user.systemId,
            },
            select: { id: true },
        });

        const idsToDelete = logsToDelete.map(log => log.id);

        if (idsToDelete.length !== ids.length) {
            // Esto significa que se intentó borrar logs que no existen o no pertenecen al usuario.
            return NextResponse.json({ error: "Algunos logs no se encontraron o no tiene permiso para eliminarlos" }, { status: 403 });
        }

        await prisma.webhookLog.deleteMany({
            where: {
                id: { in: idsToDelete },
            },
        });

        return NextResponse.json({ success: true, message: `${idsToDelete.length} logs eliminados.` });

    } catch (error) {
        console.error("Error deleting webhook logs:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 