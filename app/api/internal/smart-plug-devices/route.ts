import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from '@/lib/db';
import { auth } from "@/lib/auth";

// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.systemId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { systemId } = session.user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const credentialId = searchParams.get("credentialId");

    try {
        const skip = (page - 1) * pageSize;

        // Construir filtros dinámicamente
        const whereClause: any = { systemId };
        if (credentialId && credentialId !== 'all') {
            whereClause.credentialId = credentialId;
        }

        const [devices, totalCount] = await prisma.$transaction([
            prisma.smartPlugDevice.findMany({
                where: whereClause,
                skip,
                take: pageSize,
                include: {
                    equipmentClinicAssignment: {
                        select: {
                            id: true,
                            clinicId: true,
                            deviceName: true,
                            serialNumber: true, // ✅ INCLUIR serialNumber para formato completo
                            equipment: {
                                select: {
                                    id: true,
                                    name: true,
                                    powerThreshold: true,
                                }
                            },
                            clinic: {
                                select: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    },
                    credential: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            status: true,
                        }
                    },
                },
                orderBy: {
                    name: 'asc',
                },
            }),
            prisma.smartPlugDevice.count({ where: whereClause }),
        ]);

        // Transformar los datos para mantener compatibilidad con el frontend
        const transformedDevices = devices.map(device => ({
            ...device,
            powerThreshold: device.equipmentClinicAssignment?.equipment.powerThreshold ?? 1,
            // Mantener compatibilidad hacia atrás con el campo equipment
            equipment: device.equipmentClinicAssignment ? {
                name: device.equipmentClinicAssignment.equipment.name,
                clinicId: device.equipmentClinicAssignment.clinicId,
                powerThreshold: device.equipmentClinicAssignment.equipment.powerThreshold,
                clinic: device.equipmentClinicAssignment.clinic
            } : null,
            // Asegurar que equipmentClinicAssignment esté disponible para el modal
            equipmentClinicAssignment: device.equipmentClinicAssignment
        }));

        // Datos transformados listos para el frontend

        const response = NextResponse.json({
            data: transformedDevices,
            totalPages: Math.ceil(totalCount / pageSize),
            totalCount,
        });

        // ← FORZAR SIN CACHE EN LA RESPUESTA
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;

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
                equipmentClinicAssignmentId: body.equipmentClinicAssignmentId,
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