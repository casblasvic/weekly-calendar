import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * Handler para obtener todos los servicios.
 * TODO: Filtros (por tarifa, por familia, por clínica?), paginación, ordenación.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de servicios o un error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('clinicId');
  const isActive = searchParams.get('isActive');

  let whereClause: Prisma.ServiceWhereInput = {};

  if (clinicId) {
    console.warn("[API Services GET] Filtrado por clinicId no implementado directamente en Service.");
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
  try {
    const body = await request.json();

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
        systemId: z.string().cuid(),
    });
    const validatedData = createServiceSchema.parse(body);

    // Separar IDs de relaciones y el resto de datos
    const { systemId, categoryId, vatTypeId, ...restOfValidatedData } = validatedData;

    // Construir objeto de datos para Prisma asegurando campos obligatorios
    const dataToCreate: Prisma.ServiceCreateInput = {
        // Mantener campos obligatorios explícitamente si la desestructuración los hace opcionales
        name: validatedData.name, // Asegurar que name está presente
        durationMinutes: validatedData.durationMinutes, // Asegurar que durationMinutes está presente
        ...restOfValidatedData, // Añadir el resto de campos opcionales
        system: {
            connect: { id: systemId }
        },
        // Conectar categoría solo si se proporcionó categoryId
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        // Conectar tipo de IVA solo si se proporcionó vatTypeId
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
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el servicio' },
      { status: 500 }
    );
  }
} 