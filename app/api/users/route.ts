import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt'; // Necesario para hashear contraseñas

const saltRounds = 10; // Coste de hashing (podría ir a variables de entorno)

/**
 * Handler para obtener todos los usuarios.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de usuarios (sin passwordHash) o un error.
 */
export async function GET(request: Request) {
  try {
    const users = await prisma.user.findMany({
      // Excluir el campo passwordHash de la respuesta por seguridad
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        systemId: true,
        // Podríamos incluir roles aquí si es necesario
        // roles: { include: { role: true } }
      }
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los usuarios' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear un nuevo usuario.
 * Espera email, firstName, lastName y password en el cuerpo JSON.
 * Hashea la contraseña antes de guardarla.
 * @param request La solicitud entrante con los datos del nuevo usuario.
 * @returns NextResponse con el nuevo usuario (sin passwordHash) y estado 201, o un error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validación básica
    if (!body.email || !body.firstName || !body.lastName || !body.password) {
      return NextResponse.json(
        { message: 'Faltan campos obligatorios: email, firstName, lastName, password' },
        { status: 400 }
      );
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

    // TODO: Obtener systemId del contexto o asignar uno por defecto
    const exampleSystem = await prisma.system.findFirst({
      where: { name: 'Sistema Ejemplo Avatar' },
    });
    if (!exampleSystem) {
      throw new Error('Sistema de ejemplo no encontrado para asignar el usuario.');
    }

    // Crear el nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        passwordHash: hashedPassword,
        profileImageUrl: body.profileImageUrl, // Opcional
        isActive: body.isActive !== undefined ? body.isActive : true,
        systemId: exampleSystem.id,
        // TODO: Asignar roles si vienen en el body?
      },
      // Excluir el hash de la respuesta
      select: {
        id: true, email: true, firstName: true, lastName: true, profileImageUrl: true, 
        isActive: true, createdAt: true, updatedAt: true, systemId: true
      }
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("Error creating user:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Violación de unicidad (email)
        return NextResponse.json(
          { message: 'Ya existe un usuario con ese email.' },
          { status: 409 }
        );
      }
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el usuario' },
      { status: 500 }
    );
  }
} 