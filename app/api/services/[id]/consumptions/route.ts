import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";

// Esquema para validar el ID del servicio
const ServiceIdParamSchema = z.object({
  id: z.string().cuid({ message: "ID de servicio inválido." }),
});

// Esquema para validar datos de un nuevo consumo
const CreateConsumptionSchema = z.object({
  productId: z.string().cuid({ message: "ID de producto inválido." }),
  quantity: z.number().positive({ message: "La cantidad debe ser positiva." }),
  order: z.number().int().positive({ message: "El orden debe ser un entero positivo." }),
  notes: z.string().optional().nullable(),
});

// GET /api/services/[id]/consumptions - Obtener consumos de un servicio
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // 0. Validar autenticación
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }

  // 1. Validar params.id (que sea CUID)
  const paramsValidation = ServiceIdParamSchema.safeParse({ id: params?.id });
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de servicio inválido.' }, { status: 400 });
  }
  const { id: serviceId } = paramsValidation.data;

  try {
    // 2. Buscar consumos en DB
    const consumptions = await prisma.serviceConsumption.findMany({
      where: { serviceId },
      orderBy: { order: 'asc' }, // Ordenar por el campo 'order'
      include: { product: true } // Incluir datos del producto
    });
    return NextResponse.json(consumptions);

  } catch (error) {
    console.error(`Error fetching consumptions for service ${serviceId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

// POST /api/services/[id]/consumptions - Añadir un nuevo consumo a un servicio
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // 0. Validar autenticación
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  // 1. Validar params.id (que sea CUID)
  const paramsValidation = ServiceIdParamSchema.safeParse({ id: params?.id });
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de servicio inválido.' }, { status: 400 });
  }
  const { id: serviceId } = paramsValidation.data;

  try {
    // 2. Validar body de la request
    const body = await request.json();
    const bodyValidation = CreateConsumptionSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json({ message: 'Datos de consumo inválidos.', details: bodyValidation.error.format() }, { status: 400 });
    }
    const { productId, quantity, order, notes } = bodyValidation.data;

    // 3. Crear consumo en DB
    //    Asegurarse que el servicio y producto existen podría ser una validación extra
    const newConsumption = await prisma.serviceConsumption.create({
      data: {
        serviceId,
        productId,
        quantity,
        order,
        systemId: systemId, // 🏢 NUEVO: systemId para operaciones a nivel sistema
        clinicId: null, // 🏥 NUEVO: ServiceConsumption no está vinculado directamente a clínica específica
        // notes, // Quitado temporalmente por error L.68
      },
       include: { product: true } // Devolver con datos del producto
    });

    return NextResponse.json(newConsumption, { status: 201 }); // 201 Created

  } catch (error) {
     console.error(`Error creating consumption for service ${serviceId}:`, error);
     // Manejar errores específicos de Prisma (ej: P2003 si productId no existe)
     // Comprobar si es un error conocido de Prisma Client
     if (error instanceof Error && 'code' in error && typeof error.code === 'string' && error.code === 'P2003') {
       return NextResponse.json({ message: 'El producto especificado no existe.' }, { status: 400 });
     }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 