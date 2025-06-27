import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinicId");

    if (!clinicId) {
        return NextResponse.json({ error: "Se requiere un clinicId" }, { status: 400 });
    }

    try {
        const availableEquipment = await prisma.equipment.findMany({
            where: {
                systemId: session.user.systemId,
                clinicId: clinicId,
                smartDevice: null,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(availableEquipment);
    } catch (error) {
        console.error("Error fetching available equipment:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 