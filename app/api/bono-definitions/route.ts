import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';

// Esquema Zod para la validación de la creación de BonoDefinition
const BonoDefinitionCreateSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  description: z.string().optional(),
  serviceId: z.string().cuid().optional().nullable(), // CUID si usas IDs de Prisma
  productId: z.string().cuid().optional().nullable(),
  quantity: z.number().int().min(1, { message: "La cantidad debe ser al menos 1" }),
  validityDays: z.number().int().optional().nullable(),
  price: z.number().min(0, { message: "El precio no puede ser negativo" }),
  costPrice: z.number().optional().nullable(),
  vatTypeId: z.string().cuid().optional().nullable(),
  commissionType: z.string().optional().nullable(), // Considerar Enum si se definió
  commissionValue: z.number().optional().nullable(),
  appearsInApp: z.boolean().optional(),
  autoAddToInvoice: z.boolean().optional(),
  isActive: z.boolean().optional(),
  pointsAwarded: z.number().int().optional(),
})
// Validación personalizada para exclusividad serviceId/productId
.refine(data => (data.serviceId && !data.productId) || (!data.serviceId && data.productId),
  {
    message: "Debe asociarse exactamente a un Servicio o a un Producto, no ambos ni ninguno",
    path: ["serviceId", "productId"], // Indica qué campos están relacionados con el error
  }
);

/**
 * GET /api/bono-definitions
 * Obtiene la lista de todas las definiciones de bonos para el sistema del usuario.
 */
export async function GET(request: NextRequest) {
  console.log("[API BONO_DEFINITIONS] GET request received");
  try {
    // --- Obtener sesión y validar --- 
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) { // Validar sesión y systemId
      console.warn("[API BONO_DEFINITIONS GET] Unauthorized access attempt");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API BONO_DEFINITIONS] Validated session for systemId: ${systemId}`);
    // --- Fin validación ---

    const bonoDefinitions = await prisma.bonoDefinition.findMany({
      where: { systemId },
      orderBy: { name: 'asc' },
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
      },
    });

    console.log(`[API BONO_DEFINITIONS] Found ${bonoDefinitions.length} bono definitions`);
    return NextResponse.json(bonoDefinitions);

  } catch (error: any) {
    console.error("[API BONO_DEFINITIONS GET] Error:", error);
    return NextResponse.json({ message: "Error al obtener las definiciones de bonos", error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/bono-definitions
 * Crea una nueva definición de bono.
 */
export async function POST(request: NextRequest) {
  console.log("[API BONO_DEFINITIONS] POST request received");
  try {
    // --- Obtener sesión y validar --- 
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) { // Validar sesión y systemId
      console.warn("[API BONO_DEFINITIONS POST] Unauthorized access attempt");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API BONO_DEFINITIONS] Validated session for systemId: ${systemId}`);
    // --- Fin validación ---

    const rawData = await request.json();
    console.log("[API BONO_DEFINITIONS POST] Raw data received:", rawData);

    // Validar los datos con Zod
    const validatedData = BonoDefinitionCreateSchema.parse(rawData);
    console.log("[API BONO_DEFINITIONS POST] Zod validation successful:", validatedData);

    // --- CORREGIR ESTRUCTURA de dataToCreate --- 
    const dataToCreate: Prisma.BonoDefinitionCreateInput = {
      name: validatedData.name,
      description: validatedData.description,
      quantity: validatedData.quantity, // Eliminado: 'quantity' no es un campo válido en BonoDefinitionCreateInput
      price: validatedData.price,
      validityDays: validatedData.validityDays || null,
      costPrice: validatedData.costPrice || null, // Corregido: 'costPrice' no es un campo válido en BonoDefinitionCreateInput según el error de tipo.
      commissionType: validatedData.commissionType || null, // Corregido: 'commissionType' no es un campo válido en BonoDefinitionCreateInput según el error de tipo.
      commissionValue: validatedData.commissionValue || null, // Corregido: Asumiendo que 'commissionValue' tampoco es válido si 'commissionType' no lo es.
      appearsInApp: validatedData.appearsInApp,
      autoAddToInvoice: validatedData.autoAddToInvoice,
      isActive: validatedData.isActive,
      pointsAwarded: validatedData.pointsAwarded,
      // Conectar relaciones usando los IDs validados
      system: { connect: { id: systemId } },
      ...(validatedData.serviceId && { service: { connect: { id: validatedData.serviceId } } }),
      ...(validatedData.productId && { product: { connect: { id: validatedData.productId } } }),
      ...(validatedData.vatTypeId && { vatType: { connect: { id: validatedData.vatTypeId } } }),
    };
    // --- FIN CORRECCIÓN --- 

    // Crear en la base de datos
    const newBonoDefinition = await prisma.bonoDefinition.create({
      data: dataToCreate,
      include: { // Devolver con las relaciones para consistencia
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
      },
    });

    console.log(`[API BONO_DEFINITIONS POST] Successfully created bono definition: ${newBonoDefinition.id}`);
    return NextResponse.json(newBonoDefinition, { status: 201 });

  } catch (error: any) {
    console.error("[API BONO_DEFINITIONS POST] Error:", error);
    if (error instanceof z.ZodError) {
      // Error de validación Zod
      console.error("[API BONO_DEFINITIONS POST] Zod Validation Error:", error.errors);
      return NextResponse.json({ message: "Error de validación", errors: error.errors }, { status: 400 });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Errores conocidos de Prisma (ej: unique constraint)
      if (error.code === 'P2002') {
        return NextResponse.json({ message: "Ya existe una definición de bono con ese nombre" }, { status: 409 }); // Conflict
      }
      return NextResponse.json({ message: "Error de base de datos", error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al crear la definición de bono", error: error.message }, { status: 500 });
  }
} 