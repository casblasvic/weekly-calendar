import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth"; // Importar el helper

/**
 * Handler para obtener todos los servicios.
 * TODO: Filtros (por tarifa, por familia, por clínica?), paginación, ordenación.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de servicios o un error.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();

  if (!session || !session.user?.systemId) {
    console.error("API GET /api/services: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  const systemId = session.user.systemId;
  console.log("API GET /api/services: Usando systemId de la sesión:", systemId);

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('clinicId');
  const isActive = searchParams.get('isActive');

  let whereClause: Prisma.ServiceWhereInput = {
      systemId: systemId, // Usar el systemId de la sesión
  };

  if (clinicId) {
    console.warn("[API Services GET] Filtrado por clinicId no implementado directamente en Service.");
    // TODO: Si es necesario, añadir lógica para filtrar por clínica (posiblemente a través de Tarifas?)
  }
  if (isActive !== null) {
    whereClause.isActive = isActive === 'true';
  }

  try {
    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        category: true,
        vatType: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para crear un nuevo servicio.
 * @param request La solicitud entrante con los datos del nuevo servicio.
 * @returns NextResponse con el nuevo servicio y estado 201, o un error.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session || !session.user?.systemId) {
    console.error("API POST /api/services: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  const sessionSystemId = session.user.systemId;
  console.log("API POST /api/services: Usando systemId de la sesión:", sessionSystemId);

  try {
    const body = await request.json();

    // Quitar systemId del schema Zod, usar el de la sesión
    const createServiceSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        durationMinutes: z.number().int().positive(),
        price: z.number().positive().optional(),
        code: z.string().optional(),
        colorCode: z.string().optional(),
        requiresMedicalSignOff: z.boolean().optional(),
        pointsAwarded: z.number().int().optional(),
        isActive: z.boolean().optional(),
        categoryId: z.string().cuid().optional(),
        vatTypeId: z.string().cuid().optional(),
    });
    
    const validatedData = createServiceSchema.parse(body);

    // Extraer systemId del body
    const { categoryId, vatTypeId, ...restOfValidatedData } = validatedData;

    // Construir objeto de datos para Prisma asegurando campos obligatorios
    const dataToCreate: Prisma.ServiceCreateInput = {
        name: validatedData.name, 
        durationMinutes: validatedData.durationMinutes, 
        ...restOfValidatedData, 
        system: {
            connect: { id: sessionSystemId } // Usar SIEMPRE el systemId de la sesión
        },
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(vatTypeId && { vatType: { connect: { id: vatTypeId } } }),
    };

    const newService = await prisma.service.create({
      data: dataToCreate,
      include: {
        category: true,
        vatType: true,
      },
    });

    return NextResponse.json(newService, { status: 201 });

  } catch (error) {
    console.error("Error creating service:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Violación de unicidad (ej: name+tariffFamilyId)
      if (error.code === 'P2002') { 
        return NextResponse.json({ message: 'Conflicto de datos (ej: servicio ya existe en esa familia)' }, { status: 409 });
      }
      // P2003: Foreign key constraint failed (ej: tariffFamilyId o vatTypeId no existen)
      if (error.code === 'P2003') { 
           return NextResponse.json({ message: 'Referencia inválida (ej: familia o tipo de IVA no existe)' }, { status: 400 });
      }
    }
    if (error instanceof z.ZodError) {
      // Error de validación Zod
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el servicio' },
      { status: 500 }
    );
  }
} 