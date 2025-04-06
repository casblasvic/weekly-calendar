import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handler para obtener un usuario específico por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con el usuario encontrado (sin passwordHash) o un error.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { // Excluir hash
        id: true, email: true, firstName: true, lastName: true, profileImageUrl: true, 
        isActive: true, createdAt: true, updatedAt: true, systemId: true 
      }
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para actualizar un usuario existente por su ID.
 * NO permite actualizar la contraseña (se haría en una ruta separada).
 * @param request La solicitud con los datos de actualización.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con el usuario actualizado (sin passwordHash) o un error.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;
  try {
    const body = await request.json();

    // Excluir campos sensibles o no modificables aquí (passwordHash, systemId, email?)
    const { password, passwordHash, systemId, email, ...updateData } = body;
    
    if (email) {
      // Considerar si permitir cambio de email y cómo manejar la verificación
      console.warn(`Intento de cambiar email para usuario ${userId} ignorado en PUT básico.`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { // Excluir hash
        id: true, email: true, firstName: true, lastName: true, profileImageUrl: true, 
        isActive: true, createdAt: true, updatedAt: true, systemId: true 
      }
    });
    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para eliminar un usuario existente por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del usuario.
 * @returns NextResponse con mensaje de éxito o error.
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;
  try {
    // TODO: Añadir lógica de autorización. ¿Se puede eliminar a sí mismo?
    // TODO: Considerar si es borrado lógico (isActive = false) o físico.
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: `Usuario ${userId} eliminado` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Usuario ${userId} no encontrado` }, { status: 404 });
    }
    // Podría haber errores P2003 si el usuario tiene datos relacionados (citas, etc)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { message: `No se puede eliminar el usuario ${userId} porque tiene datos relacionados.` },
          { status: 409 } // Conflict
        );
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
} 