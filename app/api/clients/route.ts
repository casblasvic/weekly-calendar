import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handler para obtener todos los clientes.
 * TODO: Añadir paginación, filtros (por clínica, por estado), ordenación.
 * TODO: Considerar qué campos devolver (¿excluir datos sensibles?).
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de clientes o un error.
 */
export async function GET(request: Request) {
  try {
    // TODO: Añadir lógica de autorización - ¿Quién puede ver todos los clientes?
    const clients = await prisma.client.findMany({
      // Ejemplo: ordenar por apellido y nombre
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      // TODO: Filtrar por systemId del usuario/organización autenticada
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los clientes' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear un nuevo cliente.
 * @param request La solicitud entrante con los datos del nuevo cliente.
 * @returns NextResponse con el nuevo cliente y estado 201, o un error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validación básica (ejemplo)
    if (!body.firstName || !body.lastName || !body.email) {
      return NextResponse.json(
        { message: 'Faltan campos obligatorios: nombre, apellido, email' },
        { status: 400 }
      );
    }

    // TODO: Obtener systemId del usuario autenticado.
    // Por ahora, usamos el ID del sistema de ejemplo.
    const exampleSystem = await prisma.system.findFirst({
      where: { name: 'Sistema Ejemplo Avatar' },
    });
    if (!exampleSystem) {
      throw new Error('Sistema de ejemplo no encontrado para asignar el cliente.');
    }

    // Crear el nuevo cliente
    const newClient = await prisma.client.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        systemId: exampleSystem.id, // Asignar al sistema
        // Añadir otros campos opcionales
        phone: body.phone,
        address: body.address,
        city: body.city,
        postalCode: body.postalCode,
        province: body.province,
        countryCode: body.countryCode,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        gender: body.gender,
        notes: body.notes,
        isActive: body.isActive !== undefined ? body.isActive : true,
        // TODO: Gestionar relaciones (ej: clinicId si es una relación directa)
      },
    });

    return NextResponse.json(newClient, { status: 201 });

  } catch (error) {
    console.error("Error creating client:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Violación de unicidad (probablemente email+systemId)
        return NextResponse.json(
          { message: 'Ya existe un cliente con ese email en este sistema.' },
          { status: 409 }
        );
      }
    }
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al crear el cliente' },
      { status: 500 }
    );
  }
} 