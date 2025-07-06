import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getServerAuthSession } from '@/lib/auth';

// Esquema para validar la creación/actualización de VATType
const VATTypeSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  rate: z.number().positive({ message: "La tasa debe ser positiva." }),
  isDefault: z.boolean().optional().default(false),
  // systemId se añadirá desde el backend
});

/**
 * Handler para obtener todos los tipos de IVA.
 */
export async function GET(request: Request) {
  try {
    // Obtener systemId del usuario autenticado
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      return NextResponse.json(
        { message: "No autorizado o falta systemId." },
        { status: 401 }
      );
    }
    const systemId = session.user.systemId;

    const vatTypes = await prisma.vATType.findMany({
      where: { systemId: systemId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(vatTypes);

  } catch (error) {
    console.error("Error fetching VAT types:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los tipos de IVA.' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear un nuevo tipo de IVA.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
      return NextResponse.json(
        { message: "No autorizado o falta systemId." },
        { status: 401 }
      );
    }
    const systemId = session.user.systemId;

    const body = await request.json();

    // Validar body
    const validation = VATTypeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    const { name, rate, isDefault } = validation.data;

    // Si se marca como default, desmarcar cualquier otro default existente para este sistema
    if (isDefault) {
        await prisma.vATType.updateMany({
            where: { systemId: systemId, isDefault: true },
            data: { isDefault: false },
        });
    }

    // Crear el nuevo tipo de IVA
    const newVATType = await prisma.vATType.create({
      data: {
        name,
        rate,
        isDefault,
        systemId,
      },
    });

    return NextResponse.json(newVATType, { status: 201 });

  } catch (error) {
    console.error("Error creating VAT type:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Unicidad (name + systemId)
        return NextResponse.json(
          { message: 'Ya existe un tipo de IVA con ese nombre en este sistema.' },
          { status: 409 } 
        );
      }
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el tipo de IVA.' },
      { status: 500 }
    );
  }
} 