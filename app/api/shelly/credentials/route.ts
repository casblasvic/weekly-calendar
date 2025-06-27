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

        return NextResponse.json(credentials);

    } catch (error) {
        console.error('Error al obtener credenciales:', error);
        return NextResponse.json({ 
            error: "Error al obtener las credenciales" 
        }, { status: 500 });
    }
} 