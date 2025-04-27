import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de categoría inválido." }),
});

// Esquema para validar la actualización de categorías
const UpdateCategorySchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }).optional(),
  description: z.string().optional().nullable(),
  parentId: z.string().cuid({ message: "ID de categoría padre inválido." }).optional().nullable(),
  // No permitir cambiar systemId
}).strict(); // No permitir campos extra

/**
 * Handler para obtener una categoría específica por ID.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Validar ID
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de categoría inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: categoryId } = paramsValidation.data;

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      // Incluir relaciones si es necesario (ej: padre, hijos directos)
      // include: { parent: true, children: true },
    });

    if (!category) {
      return NextResponse.json({ message: `Categoría ${categoryId} no encontrada.` }, { status: 404 });
    }
    return NextResponse.json(category);

  } catch (error) {
    console.error(`Error fetching category ${categoryId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Handler para actualizar una categoría existente.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // Validar ID
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de categoría inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: categoryId } = paramsValidation.data;

  try {
    const body = await request.json();

    // Validar body
    const validation = UpdateCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    const updateData = validation.data;

    // Verificar que se intenta actualizar algo
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
    }
    
    // Prevenir ciclos: No permitir que una categoría sea su propio padre
    if (updateData.parentId && updateData.parentId === categoryId) {
      return NextResponse.json({ message: 'Una categoría no puede ser su propia categoría padre.' }, { status: 400 });
    }

    // TODO: ¿Validar que el parentId pertenezca al mismo systemId?

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });

    return NextResponse.json(updatedCategory);

  } catch (error) {
    console.error(`Error updating category ${categoryId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: `Categoría ${categoryId} no encontrada.` }, { status: 404 });
      }
       if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe otra categoría con ese nombre.' }, { status: 409 });
      }
       // Error de Foreign Key (parentId no existe)
      if (error.code === 'P2003' && error.meta?.field_name === 'CategoryHierarchy_parentId_fkey (index)') {
         return NextResponse.json({ message: 'La categoría padre especificada no existe.' }, { status: 400 });
      }
      // Podría haber error P2016 si se intenta crear un ciclo en la jerarquía, aunque la validación manual ayuda
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al actualizar.' }, { status: 500 });
  }
}

/**
 * Handler para eliminar una categoría.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
   // Validar ID
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de categoría inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: categoryId } = paramsValidation.data;

  try {
    // Intentar eliminar
    await prisma.category.delete({ where: { id: categoryId } });
    return NextResponse.json({ message: `Categoría ${categoryId} eliminada.` }, { status: 200 });

  } catch (error) {
     console.error(`Error deleting category ${categoryId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Registro no encontrado
      if (error.code === 'P2025') {
        return NextResponse.json({ message: `Categoría ${categoryId} no encontrada.` }, { status: 404 });
      }
      // P2003: Violación de FK (probablemente por onDelete: Restrict en la relación padre-hijo)
      // Esto significa que tiene subcategorías y no se puede borrar.
      if (error.code === 'P2003' && error.message.includes('CategoryHierarchy')) {
         return NextResponse.json(
           { message: 'No se puede eliminar la categoría porque tiene subcategorías asociadas.' },
           { status: 409 } // Conflict
         );
      }
    }
    return NextResponse.json({ message: 'Error interno del servidor al eliminar.' }, { status: 500 });
  }
} 