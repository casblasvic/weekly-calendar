import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { systemId } = session.user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    try {
        const skip = (page - 1) * pageSize;

        const [devices, totalCount] = await prisma.$transaction([
            prisma.smartPlugDevice.findMany({
                where: { systemId },
                skip,
                take: pageSize,
                include: {
                    equipment: {
                        select: {
                            name: true,
                            clinicId: true,
                            clinic: {
                                select: {
                                    name: true,
                                }
                            }
                        },
                    },
                },
                orderBy: {
                    name: 'asc',
                },
            }),
            prisma.smartPlugDevice.count({ where: { systemId } }),
        ]);

        return NextResponse.json({
            data: devices,
            totalPages: Math.ceil(totalCount / pageSize),
            totalCount,
        });

    } catch (error) {
        console.error("Error fetching smart plug devices:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const body = await request.json();
        const newDevice = await prisma.smartPlugDevice.create({
            data: {
                name: body.name,
                type: 'SHELLY', // Por ahora, harcodeado a Shelly
                deviceId: body.deviceId,
                deviceIp: body.deviceIp,
                equipmentId: body.equipmentId,
                systemId: session.user.systemId,
                // integrationId se deberá obtener del módulo activado
                integrationId: body.integrationId, // Provisional
                clinicId: body.clinicId, // Provisional
            },
        });
        return NextResponse.json(newDevice, { status: 201 });
    } catch (error) {
        console.error("Error creating smart plug device:", error);
        return NextResponse.json({ error: "Error al crear el dispositivo" }, { status: 500 });
    }
} 