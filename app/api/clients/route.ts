import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión
import { z } from 'zod'; // Importar Zod para validación

/**
 * Handler para obtener todos los clientes DEL SISTEMA ACTUAL.
 * TODO: Añadir paginación, filtros (por clínica, por estado), ordenación.
 * TODO: Considerar qué campos devolver (¿excluir datos sensibles?).
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de clientes o un error.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    // TODO: Añadir lógica de autorización -> Hecho: filtrado por systemId
    const clients = await prisma.client.findMany({
      where: { systemId: systemId }, // <<< Filtrar por systemId de la sesión
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ],
      // TODO: Filtrar por systemId del usuario/organización autenticada -> Hecho
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

// Esquema Zod para la creación de clientes
const createClientSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio."),
  lastName: z.string().min(1, "El apellido es obligatorio."),
  email: z.string().email("Email inválido."), // Email es único por sistema
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Formato de fecha de nacimiento inválido.",
  }).transform(val => val ? new Date(val) : null), // Convertir a Date
  gender: z.string().optional().nullable(), // Podría ser un enum
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  // TODO: Añadir clinicId si es necesario como relación directa
});

/**
 * Handler para crear un nuevo cliente EN EL SISTEMA ACTUAL.
 * @param request La solicitud entrante con los datos del nuevo cliente.
 * @returns NextResponse con el nuevo cliente y estado 201, o un error.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId; // <<< Usar systemId de la sesión

  try {
    const body = await request.json();

    // Validar con Zod
    const validation = createClientSchema.safeParse(body);
     if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos.', details: validation.error.format() },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    // // Validación básica -> Reemplazada por Zod
    // if (!body.firstName || !body.lastName || !body.email) {
    //   return NextResponse.json(
    //     { message: 'Faltan campos obligatorios: nombre, apellido, email' },
    //     { status: 400 }
    //   );
    // }

    // // TODO: Obtener systemId del usuario autenticado. -> Hecho
    // // Por ahora, usamos el ID del sistema de ejemplo.
    // const exampleSystem = await prisma.system.findFirst({
    //   where: { name: 'Sistema Ejemplo Avatar' },
    // });
    // if (!exampleSystem) {
    //   throw new Error('Sistema de ejemplo no encontrado para asignar el cliente.');
    // }

    // Crear el nuevo cliente - Construir data explícitamente
    const newClient = await prisma.client.create({
      data: {
        // --- Campos de validatedData ---
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        province: validatedData.province,
        countryCode: validatedData.countryCode,
        birthDate: validatedData.birthDate, // Ya es Date o null
        gender: validatedData.gender,
        notes: validatedData.notes,
        isActive: validatedData.isActive,
        // --- Fin Campos validatedData ---
        
        systemId: systemId, // <<< Asignar systemId de la sesión
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
    if (error instanceof z.ZodError) { // Añadir manejo Zod Error
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
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