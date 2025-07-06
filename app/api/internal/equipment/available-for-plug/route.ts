import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

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
        // Buscar equipos que tienen asignaciones activas a la clínica especificada
        // y que no están ya asociados a un SmartPlugDevice
        const availableEquipment = await prisma.equipment.findMany({
            where: {
                systemId: session.user.systemId,
                smartDevice: null, // No debe estar ya asociado a un enchufe
                clinicAssignments: {
                    some: {
                        clinicId: clinicId,
                        isActive: true
                    }
                }
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