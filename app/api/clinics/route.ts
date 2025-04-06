import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Importar la instancia de Prisma
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // Obtener todas las clínicas de la base de datos
    const clinics = await prisma.clinic.findMany({
      // Aquí podríamos añadir filtros, ordenación, etc. si fuera necesario
      // Por ejemplo: orderBy: { name: 'asc' }
    });

    // Devolver las clínicas como JSON
    return NextResponse.json(clinics);

  } catch (error) {
    console.error("Error fetching clinics:", error);
    // Devolver una respuesta de error genérica
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener las clínicas' },
      { status: 500 }
    );
  }
}

/**
 * Handler para crear una nueva clínica.
 * Espera los datos de la clínica en el cuerpo de la solicitud (JSON).
 * @param request La solicitud entrante con los datos de la nueva clínica.
 * @returns NextResponse con la clínica creada (JSON) y estado 201, o un mensaje de error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validación básica (asegurar campos obligatorios sin valor por defecto)
    if (!body.name || !body.currency) {
      return NextResponse.json(
        { message: 'Faltan campos obligatorios: nombre y moneda' },
        { status: 400 } // Bad Request
      );
    }

    // TODO: Obtener systemId del usuario autenticado o contexto
    // Por ahora, usamos el ID del sistema de ejemplo si existe
    const exampleSystem = await prisma.system.findFirst({
      where: { name: 'Sistema Ejemplo Avatar' },
    });
    if (!exampleSystem) {
      throw new Error('Sistema de ejemplo no encontrado para asignar la clínica.');
    }

    // Crear la nueva clínica en la base de datos
    const newClinic = await prisma.clinic.create({
      data: {
        name: body.name,
        currency: body.currency,
        systemId: exampleSystem.id, // Asignar al sistema de ejemplo
        // Añadir otros campos opcionales del body si existen
        address: body.address,
        city: body.city,
        postalCode: body.postalCode,
        province: body.province,
        countryCode: body.countryCode,
        timezone: body.timezone,
        phone: body.phone,
        email: body.email,
        isActive: body.isActive !== undefined ? body.isActive : true, // Default a true si no se especifica
      },
    });

    // Devolver la clínica creada con estado 201
    return NextResponse.json(newClinic, { status: 201 });

  } catch (error) {
    console.error("Error creating clinic:", error);

    // Manejar error específico de Prisma (ej: violación de índice único si name+systemId ya existe)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Unique constraint violation
        return NextResponse.json(
          { message: 'Ya existe una clínica con ese nombre en este sistema.' },
          { status: 409 } // Conflict
        );
      }
    }
    
    // Error de parseo JSON u otro error
    if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido en el cuerpo de la solicitud' }, { status: 400 });
    }

    // Devolver error genérico del servidor
    return NextResponse.json(
      { message: 'Error interno del servidor al crear la clínica' },
      { status: 500 }
    );
  }
}

// Podríamos añadir funciones PUT, DELETE aquí más tarde 