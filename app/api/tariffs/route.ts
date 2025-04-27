import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";

/**
 * Handler para obtener todas las tarifas del sistema actual.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    console.error("API GET /api/tariffs: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  const systemId = session.user.systemId;
  console.log("API GET /api/tariffs: Usando systemId de la sesión:", systemId);

  try {
    const tariffs = await prisma.tariff.findMany({
      where: { systemId: systemId },
      orderBy: { name: 'asc' },
      include: {
        clinics: {
          select: {
            id: true,
            name: true,
            prefix: true
          }
        }
      }
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
 * Handler para crear una nueva tarifa para el sistema actual.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    console.error("API POST /api/tariffs: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  const systemId = session.user.systemId;
  console.log("API POST /api/tariffs: Usando systemId de la sesión:", systemId);

  try {
    const body = await request.json();

    // Validar con Zod
    const createTariffSchema = z.object({
      name: z.string().min(1, "El nombre es obligatorio."),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      // Otros campos como defaultVatTypeId si es necesario
    });
    const validatedData = createTariffSchema.parse(body);

    // Crear la nueva tarifa usando el systemId de la sesión
    const newTariff = await prisma.tariff.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        systemId: systemId,
        isActive: validatedData.isActive !== undefined ? validatedData.isActive : true,
      },
      include: {
        clinics: {
          select: {
            id: true,
            name: true,
            prefix: true
          }
        }
      }
    });

    return NextResponse.json(newTariff, { status: 201 });

  } catch (error) {
    console.error("Error creating tariff:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Ya existe una tarifa con ese nombre en este sistema.' },
          { status: 409 }
        );
      }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: error.errors }, { status: 400 });
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