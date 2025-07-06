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
        const clinics = await prisma.clinic.findMany({
            where: {
                systemId: session.user.systemId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(clinics);
    } catch (error) {
        console.error("Error fetching clinics list:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
} 