import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";

// Esquema Zod para validar la actualización (PUT)
// Permitimos actualizar quantity, price y productId
const updateConsumptionSchema = z.object({
    quantity: z.number().positive({ message: "La cantidad debe ser positiva." }).optional(),
    price: z.number().nonnegative({ message: "El precio no puede ser negativo." }).optional(),
    productId: z.string().cuid({ message: "ID de producto inválido." }).optional(),
    // serviceId y systemId no se pueden cambiar
    // order se manejaría en una ruta separada
}).strict(); // No permitir campos extra

/**
 * Handler PUT para actualizar un consumo de servicio existente.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
        return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
    }
    const sessionSystemId = session.user.systemId;
    const consumptionId = params.id;

    console.log(`[API Consumptions PUT] Request to update consumption ${consumptionId} for system ${sessionSystemId}`);

    try {
        // 1. Validar el cuerpo de la solicitud
        const body = await request.json();
        const validation = updateConsumptionSchema.safeParse(body);
        if (!validation.success) {
            console.error("[API Consumptions PUT] Validation failed:", validation.error.format());
            return NextResponse.json({ message: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
        }
        const dataToUpdate = validation.data;

        // 2. Verificar que el consumo existe y pertenece al sistema del usuario (vía Servicio)
        const consumption = await prisma.serviceConsumption.findFirst({
            where: {
                id: consumptionId,
                service: { // <<< Verificar a través de la relación con Service
                    systemId: sessionSystemId 
                }
            },
            select: { id: true, productId: true, service: { select: { systemId: true } } } // Incluir service.systemId si fuera necesario después
        });

        if (!consumption) {
            console.warn(`[API Consumptions PUT] Consumption ${consumptionId} not found or not owned by system ${sessionSystemId}`);
            return NextResponse.json({ message: 'Consumo no encontrado o no autorizado.' }, { status: 404 });
        }

        // 3. Si se actualiza productId, verificar que el nuevo producto pertenece al sistema
        if (dataToUpdate.productId && dataToUpdate.productId !== consumption.productId) {
            const product = await prisma.product.findFirst({
                where: {
                    id: dataToUpdate.productId,
                    systemId: sessionSystemId // Product sí tiene systemId directo
                },
                select: { id: true }
            });
            if (!product) {
                console.warn(`[API Consumptions PUT] Product ${dataToUpdate.productId} not found or not owned by system ${sessionSystemId}`);
                return NextResponse.json({ message: 'Producto especificado no encontrado o no pertenece a tu sistema.' }, { status: 400 });
            }
        }

        // 4. Actualizar el consumo
        console.log(`[API Consumptions PUT] Updating consumption ${consumptionId} with data:`, dataToUpdate);
        const updatedConsumption = await prisma.serviceConsumption.update({
            where: { id: consumptionId }, // Ya sabemos que existe y pertenece al sistema
            data: dataToUpdate,
            include: { product: true } // Incluir producto para devolver datos completos
        });
        console.log(`[API Consumptions PUT] Consumption ${consumptionId} updated successfully.`);

        return NextResponse.json(updatedConsumption);

    } catch (error) {
        console.error(`[API Consumptions PUT] Error updating consumption ${consumptionId}:`, error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Manejar errores específicos si es necesario (ej: P2025 Record not found)
            if (error.code === 'P2025') {
                 return NextResponse.json({ message: 'Error: El consumo a actualizar no fue encontrado.' }, { status: 404 });
            }
            // Podría haber error P2003 si productId no existe (aunque ya lo validamos)
            if (error.code === 'P2003') {
                 return NextResponse.json({ message: 'Error: El producto asociado no existe.' }, { status: 400 });
            }
        }
        if (error instanceof z.ZodError) {
            // Ya manejado arriba, pero por si acaso
            return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
        }
        if (error instanceof SyntaxError) { 
            return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error interno del servidor al actualizar el consumo.' }, { status: 500 });
    }
}

/**
 * Handler DELETE para eliminar un consumo de servicio existente.
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
        return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
    }
    const sessionSystemId = session.user.systemId;
    const consumptionId = params.id;

    console.log(`[API Consumptions DELETE] Request to delete consumption ${consumptionId} for system ${sessionSystemId}`);

    try {
        // 1. Verificar que el consumo existe y pertenece al sistema del usuario (vía Servicio)
        const consumption = await prisma.serviceConsumption.findFirst({
            where: {
                id: consumptionId,
                service: { // <<< Verificar a través de la relación con Service
                   systemId: sessionSystemId
                }
            },
            select: { id: true } 
        });

        if (!consumption) {
            console.warn(`[API Consumptions DELETE] Consumption ${consumptionId} not found or not owned by system ${sessionSystemId}`);
            return NextResponse.json({ message: 'Consumo no encontrado o no autorizado.' }, { status: 404 });
        }

        // 2. Eliminar el consumo
        console.log(`[API Consumptions DELETE] Deleting consumption ${consumptionId}`);
        await prisma.serviceConsumption.delete({
            where: { id: consumptionId }, // Ya sabemos que existe y pertenece al sistema
        });
        console.log(`[API Consumptions DELETE] Consumption ${consumptionId} deleted successfully.`);

        return NextResponse.json({ message: 'Consumo eliminado correctamente.' }, { status: 200 }); // O 204 No Content

    } catch (error) {
        console.error(`[API Consumptions DELETE] Error deleting consumption ${consumptionId}:`, error);
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // P2025: Record to delete does not exist.
            if (error.code === 'P2025') {
                 console.warn(`[API Consumptions DELETE] Attempted to delete non-existent consumption ${consumptionId}`);
                 // Aunque ya validamos antes, puede haber concurrencia.
                 return NextResponse.json({ message: 'Error: El consumo a eliminar no fue encontrado.' }, { status: 404 });
            }
        }
        return NextResponse.json({ message: 'Error interno del servidor al eliminar el consumo.' }, { status: 500 });
    }
}
