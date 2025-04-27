import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";

// Esquema para validar la creación/actualización de categorías
const CategorySchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  parentId: z.string().cuid({ message: "ID de categoría padre inválido." }).optional().nullable(),
});

/**
 * Handler para obtener todas las categorías del sistema actual.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    // Obtener todas las categorías del sistema
    const categories = await prisma.category.findMany({
      where: { systemId: systemId },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear una nueva categoría en el sistema actual.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const body = await request.json();

    // Validar body
    const validation = CategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    const { name, description, parentId } = validation.data;

    // Crear la nueva categoría
    const newCategory = await prisma.category.create({
      data: {
        name,
        description,
        parentId,
        systemId: systemId,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });

  } catch (error) {
    console.error("Error creating category:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { message: 'Ya existe una categoría con ese nombre.' }, { status: 409 }
        );
      }
      if (error.code === 'P2003' && error.meta?.field_name?.toString().includes('parentId')) {
         return NextResponse.json({ message: 'La categoría padre no existe.' }, { status: 400 });
      }
    }
     if (error instanceof z.ZodError) {
       return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 