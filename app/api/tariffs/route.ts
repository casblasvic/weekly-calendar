import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * Handler para obtener todas las tarifas.
 * TODO: Filtros (por clínica asociada?), ordenación.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de tarifas o un error.
 */
export async function GET(request: Request) {
  try {
    // TODO: Lógica de autorización
    // TODO: Filtrar por systemId?
    const tariffs = await prisma.tariff.findMany({
      orderBy: { name: 'asc' },
      // Podríamos incluir relaciones si fuera necesario, ej: include { clinics: true }
    });
    return NextResponse.json(tariffs);
  } catch (error) {
    console.error("Error fetching tariffs:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener las tarifas' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear una nueva tarifa.
 * @param request La solicitud entrante con los datos de la nueva tarifa.
 * @returns NextResponse con la nueva tarifa y estado 201, o un error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validación básica
    if (!body.name) {
      return NextResponse.json(
        { message: 'Falta campo obligatorio: nombre' },
        { status: 400 }
      );
    }

    // TODO: Obtener systemId del usuario autenticado.
    const exampleSystem = await prisma.system.findFirst({
      where: { name: 'Sistema Ejemplo Avatar' },
    });
    if (!exampleSystem) {
      throw new Error('Sistema de ejemplo no encontrado para asignar la tarifa.');
    }

    // Crear la nueva tarifa
    const newTariff = await prisma.tariff.create({
      data: {
        name: body.name,
        description: body.description,
        systemId: exampleSystem.id,
        isActive: body.isActive !== undefined ? body.isActive : true,
        // TODO: Manejar relaciones iniciales (ej: asociar a una clínica?)
      },
    });

    return NextResponse.json(newTariff, { status: 201 });

  } catch (error) {
    console.error("Error creating tariff:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Violación de unicidad (nombre + systemId?)
        return NextResponse.json(
          { message: 'Ya existe una tarifa con ese nombre en este sistema.' },
          { status: 409 }
        );
      }
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear la tarifa' },
      { status: 500 }
    );
  }
} 